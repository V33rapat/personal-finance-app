import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PrismaTransaction,
  TransferService,
  TransferValues,
} from '../transfer/transfer.service';
import { AllocationDestinationDto } from './dto/allocation-destination.dto';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';

const allocationInclude = {
  wallets_money_allocations_source_wallet_idTowallets: {
    select: { id: true, name: true },
  },
  transfers: {
    where: { deleted_at: null },
    orderBy: { created_at: 'asc' },
    include: {
      wallets_transfers_to_wallet_idTowallets: {
        select: { id: true, name: true },
      },
    },
  },
} satisfies Prisma.money_allocationsInclude;

type AllocationRecord = Prisma.money_allocationsGetPayload<{
  include: typeof allocationInclude;
}>;

interface AllocationDestinationValues {
  wallet_id: string;
  amount: Prisma.Decimal;
}

interface AllocationValues {
  source_wallet_id: string;
  amount: Prisma.Decimal;
  allocation_date: string;
  note: string | null;
  destinations: AllocationDestinationValues[];
}

@Injectable()
export class AllocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transferService: TransferService,
  ) {}

  async create(userId: string, dto: CreateAllocationDto) {
    const values = this.toCreateValues(dto);

    return this.prisma.$transaction(async (tx) => {
      await this.assertEligibleWallets(tx, userId, [
        values.source_wallet_id,
        ...values.destinations.map((destination) => destination.wallet_id),
      ]);

      const allocation = await tx.money_allocations.create({
        data: {
          user_id: userId,
          source_wallet_id: values.source_wallet_id,
          amount: values.amount,
          allocation_date: this.toAllocationDate(values.allocation_date),
          note: values.note,
        },
      });

      await this.createTransfers(tx, userId, allocation.id, values);

      return this.toResponse(
        await this.findAllocationRecord(tx, userId, allocation.id),
      );
    });
  }

  async findAll(userId: string) {
    const allocations = await this.prisma.money_allocations.findMany({
      where: { user_id: userId, deleted_at: null },
      include: allocationInclude,
      orderBy: { allocation_date: 'desc' },
    });

    return allocations.map((allocation) => this.toResponse(allocation));
  }

  async findOne(userId: string, id: string) {
    return this.toResponse(
      await this.findAllocationRecord(this.prisma, userId, id),
    );
  }

  async update(userId: string, id: string, dto: UpdateAllocationDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.findAllocationRecord(tx, userId, id);
      const values = this.toUpdateValues(existing, dto);
      const affectsBalance = this.hasBalanceAffectingChanges(existing, values);
      const updatedAt = new Date();

      if (affectsBalance) {
        await this.assertEligibleWallets(tx, userId, [
          values.source_wallet_id,
          ...values.destinations.map((destination) => destination.wallet_id),
        ]);

        for (const transfer of existing.transfers) {
          await this.transferService.reverseAndSoftDeleteInTransaction(
            tx,
            userId,
            transfer,
            updatedAt,
          );
        }

        await this.createTransfers(tx, userId, id, values);
      } else {
        for (const transfer of existing.transfers) {
          await this.transferService.updateMetadataInTransaction(
            tx,
            transfer,
            values.allocation_date,
            values.note,
            updatedAt,
          );
        }
      }

      await tx.money_allocations.update({
        where: { id },
        data: {
          source_wallet_id: values.source_wallet_id,
          amount: values.amount,
          allocation_date: this.toAllocationDate(values.allocation_date),
          note: values.note,
          updated_at: updatedAt,
        },
      });

      return this.toResponse(await this.findAllocationRecord(tx, userId, id));
    });
  }

  async delete(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.findAllocationRecord(tx, userId, id);
      const deletedAt = new Date();

      for (const transfer of existing.transfers) {
        await this.transferService.reverseAndSoftDeleteInTransaction(
          tx,
          userId,
          transfer,
          deletedAt,
        );
      }

      await tx.money_allocations.update({
        where: { id },
        data: { deleted_at: deletedAt, updated_at: deletedAt },
      });

      return { id };
    });
  }

  private async createTransfers(
    tx: PrismaTransaction,
    userId: string,
    allocationId: string,
    values: AllocationValues,
  ) {
    for (const destination of values.destinations) {
      const transferValues: TransferValues = {
        from_wallet_id: values.source_wallet_id,
        to_wallet_id: destination.wallet_id,
        amount: destination.amount,
        transfer_date: values.allocation_date,
        note: values.note,
      };

      await this.transferService.createInTransaction(
        tx,
        userId,
        transferValues,
        allocationId,
      );
    }
  }

  private async findAllocationRecord(
    client: PrismaService | PrismaTransaction,
    userId: string,
    id: string,
  ) {
    const allocation = await client.money_allocations.findFirst({
      where: { id, user_id: userId, deleted_at: null },
      include: allocationInclude,
    });

    if (!allocation) {
      throw new NotFoundException('Money allocation not found');
    }

    return allocation;
  }

  private async assertEligibleWallets(
    tx: PrismaTransaction,
    userId: string,
    walletIds: string[],
  ) {
    const uniqueWalletIds = [...new Set(walletIds)];
    const wallets = await tx.wallets.findMany({
      where: {
        id: { in: uniqueWalletIds },
        user_id: userId,
        deleted_at: null,
        is_active: true,
      },
      select: { id: true },
    });

    if (wallets.length !== uniqueWalletIds.length) {
      throw new NotFoundException('Eligible wallet not found');
    }

    const activeSubWallet = await tx.wallets.findFirst({
      where: {
        parent_wallet_id: { in: uniqueWalletIds },
        deleted_at: null,
        is_active: true,
      },
      select: { id: true },
    });

    if (activeSubWallet) {
      throw new BadRequestException(
        'Please allocate money through an active sub-wallet.',
      );
    }
  }

  private toCreateValues(dto: CreateAllocationDto): AllocationValues {
    return this.validateValues({
      source_wallet_id: dto.source_wallet_id,
      amount: new Prisma.Decimal(dto.amount),
      allocation_date: dto.allocation_date,
      note: dto.note?.trim() || null,
      destinations: this.toDestinationValues(dto.destinations),
    });
  }

  private toUpdateValues(
    existing: AllocationRecord,
    dto: UpdateAllocationDto,
  ): AllocationValues {
    return this.validateValues({
      source_wallet_id: dto.source_wallet_id ?? existing.source_wallet_id,
      amount:
        dto.amount !== undefined
          ? new Prisma.Decimal(dto.amount)
          : new Prisma.Decimal(existing.amount),
      allocation_date:
        dto.allocation_date ??
        existing.allocation_date.toISOString().split('T')[0],
      note: dto.note !== undefined ? dto.note?.trim() || null : existing.note,
      destinations:
        dto.destinations !== undefined
          ? this.toDestinationValues(dto.destinations)
          : existing.transfers.map((transfer) => ({
              wallet_id: transfer.to_wallet_id,
              amount: new Prisma.Decimal(transfer.amount),
            })),
    });
  }

  private toDestinationValues(destinations: AllocationDestinationDto[]) {
    return destinations.map((destination) => ({
      wallet_id: destination.wallet_id,
      amount: new Prisma.Decimal(destination.amount),
    }));
  }

  private validateValues(values: AllocationValues): AllocationValues {
    if (values.destinations.length < 1 || values.destinations.length > 10) {
      throw new BadRequestException(
        'Money allocation must have between 1 and 10 destinations',
      );
    }

    this.assertValidAmount(values.amount);

    const destinationIds = new Set<string>();
    const destinationTotal = values.destinations.reduce(
      (total, destination) => {
        if (destination.wallet_id === values.source_wallet_id) {
          throw new BadRequestException(
            'Source wallet cannot also be a destination wallet',
          );
        }

        if (destinationIds.has(destination.wallet_id)) {
          throw new BadRequestException('Destination wallets must be unique');
        }

        destinationIds.add(destination.wallet_id);
        this.assertValidAmount(destination.amount);
        return total.plus(destination.amount);
      },
      new Prisma.Decimal(0),
    );

    if (!destinationTotal.equals(values.amount)) {
      throw new BadRequestException(
        'Destination amounts must equal the allocation amount',
      );
    }

    this.assertNotFutureDate(values.allocation_date);

    return values;
  }

  private assertValidAmount(amount: Prisma.Decimal) {
    if (!amount.isFinite() || amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (amount.decimalPlaces() > 2) {
      throw new BadRequestException('Amount can have at most 2 decimal places');
    }
  }

  private hasBalanceAffectingChanges(
    existing: AllocationRecord,
    values: AllocationValues,
  ) {
    if (existing.source_wallet_id !== values.source_wallet_id) {
      return true;
    }

    if (existing.transfers.length !== values.destinations.length) {
      return true;
    }

    const existingAmounts = new Map(
      existing.transfers.map((transfer) => [
        transfer.to_wallet_id,
        new Prisma.Decimal(transfer.amount),
      ]),
    );

    return values.destinations.some((destination) => {
      const existingAmount = existingAmounts.get(destination.wallet_id);
      return !existingAmount || !existingAmount.equals(destination.amount);
    });
  }

  private assertNotFutureDate(dateString: string) {
    const allocationDate = dateString.split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    if (allocationDate > today) {
      throw new BadRequestException('Allocation date cannot be in the future');
    }
  }

  private toAllocationDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid allocation date');
    }

    return date;
  }

  private toResponse(allocation: AllocationRecord) {
    return {
      id: allocation.id,
      source_wallet_id: allocation.source_wallet_id,
      source_wallet_name:
        allocation.wallets_money_allocations_source_wallet_idTowallets.name,
      amount: allocation.amount.toString(),
      allocation_date: allocation.allocation_date,
      note: allocation.note,
      created_at: allocation.created_at,
      updated_at: allocation.updated_at,
      destinations: allocation.transfers.map((transfer) => ({
        transfer_id: transfer.id,
        wallet_id: transfer.to_wallet_id,
        wallet_name: transfer.wallets_transfers_to_wallet_idTowallets.name,
        amount: transfer.amount.toString(),
      })),
    };
  }
}
