import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';

const transferInclude = {
  wallets_transfers_from_wallet_idTowallets: true,
  wallets_transfers_to_wallet_idTowallets: true,
  transactions_transfers_from_transaction_idTotransactions: true,
  transactions_transfers_to_transaction_idTotransactions: true,
} satisfies Prisma.transfersInclude;

interface TransferValues {
  from_wallet_id: string;
  to_wallet_id: string;
  amount: Prisma.Decimal;
  transfer_date: string;
  note: string | null;
}

type PrismaTransaction = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

@Injectable()
export class TransferService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransferDto) {
    const values = this.toCreateValues(dto);

    return this.prisma.$transaction(async (tx) => {
      const { fromWallet, toWallet } = await this.getTransferWallets(
        tx,
        userId,
        values.from_wallet_id,
        values.to_wallet_id,
      );
      const transferDate = this.toTransferDate(values.transfer_date);

      await this.applyTransferBalance(tx, userId, values);

      const fromTransaction = await tx.transactions.create({
        data: {
          wallet_id: values.from_wallet_id,
          name: this.getFromTransactionName(toWallet.name),
          type: 'expense',
          amount: values.amount,
          transaction_date: transferDate,
          note: values.note,
          category_id: null,
        },
      });

      const toTransaction = await tx.transactions.create({
        data: {
          wallet_id: values.to_wallet_id,
          name: this.getToTransactionName(fromWallet.name),
          type: 'income',
          amount: values.amount,
          transaction_date: transferDate,
          note: values.note,
          category_id: null,
        },
      });

      return tx.transfers.create({
        data: {
          from_wallet_id: values.from_wallet_id,
          to_wallet_id: values.to_wallet_id,
          from_transaction_id: fromTransaction.id,
          to_transaction_id: toTransaction.id,
          amount: values.amount,
          note: values.note,
          transfer_date: transferDate,
        },
        include: transferInclude,
      });
    });
  }

  async findAll(userId: string) {
    return this.prisma.transfers.findMany({
      where: this.getUserTransferWhere(userId),
      include: transferInclude,
      orderBy: { transfer_date: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const transfer = await this.prisma.transfers.findFirst({
      where: {
        id,
        ...this.getUserTransferWhere(userId),
      },
      include: transferInclude,
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  async update(userId: string, id: string, dto: UpdateTransferDto) {
    const existing = await this.findOne(userId, id);
    const values = this.toUpdateValues(existing, dto);

    return this.prisma.$transaction(async (tx) => {
      const { fromWallet, toWallet } = await this.getTransferWallets(
        tx,
        userId,
        values.from_wallet_id,
        values.to_wallet_id,
      );
      const transferDate = this.toTransferDate(values.transfer_date);

      await this.reverseTransferBalance(tx, userId, {
        from_wallet_id: existing.from_wallet_id,
        to_wallet_id: existing.to_wallet_id,
        amount: new Prisma.Decimal(existing.amount),
      });

      await this.applyTransferBalance(tx, userId, values);

      if (!existing.from_transaction_id || !existing.to_transaction_id) {
        throw new BadRequestException('Transfer is missing paired transactions');
      }

      await tx.transactions.update({
        where: { id: existing.from_transaction_id },
        data: {
          wallet_id: values.from_wallet_id,
          name: this.getFromTransactionName(toWallet.name),
          type: 'expense',
          amount: values.amount,
          transaction_date: transferDate,
          note: values.note,
          category_id: null,
          deleted_at: null,
          updated_at: new Date(),
        },
      });

      await tx.transactions.update({
        where: { id: existing.to_transaction_id },
        data: {
          wallet_id: values.to_wallet_id,
          name: this.getToTransactionName(fromWallet.name),
          type: 'income',
          amount: values.amount,
          transaction_date: transferDate,
          note: values.note,
          category_id: null,
          deleted_at: null,
          updated_at: new Date(),
        },
      });

      return tx.transfers.update({
        where: { id },
        data: {
          from_wallet_id: values.from_wallet_id,
          to_wallet_id: values.to_wallet_id,
          amount: values.amount,
          note: values.note,
          transfer_date: transferDate,
          updated_at: new Date(),
        },
        include: transferInclude,
      });
    });
  }

  async delete(userId: string, id: string) {
    const existing = await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      await this.reverseTransferBalance(tx, userId, {
        from_wallet_id: existing.from_wallet_id,
        to_wallet_id: existing.to_wallet_id,
        amount: new Prisma.Decimal(existing.amount),
      });

      if (existing.from_transaction_id) {
        await tx.transactions.update({
          where: { id: existing.from_transaction_id },
          data: { deleted_at: new Date(), updated_at: new Date() },
        });
      }

      if (existing.to_transaction_id) {
        await tx.transactions.update({
          where: { id: existing.to_transaction_id },
          data: { deleted_at: new Date(), updated_at: new Date() },
        });
      }

      return tx.transfers.update({
        where: { id },
        data: { deleted_at: new Date(), updated_at: new Date() },
        include: transferInclude,
      });
    });
  }

  private getUserTransferWhere(userId: string): Prisma.transfersWhereInput {
    return {
      deleted_at: null,
      wallets_transfers_from_wallet_idTowallets: {
        user_id: userId,
        deleted_at: null,
      },
      wallets_transfers_to_wallet_idTowallets: {
        user_id: userId,
        deleted_at: null,
      },
    };
  }

  private toCreateValues(dto: CreateTransferDto): TransferValues {
    return this.validateTransferValues({
      from_wallet_id: dto.from_wallet_id,
      to_wallet_id: dto.to_wallet_id,
      amount: new Prisma.Decimal(dto.amount),
      transfer_date: dto.transfer_date,
      note: dto.note?.trim() || null,
    });
  }

  private toUpdateValues(
    existing: { amount: Prisma.Decimal; note: string | null; transfer_date: Date } & {
      from_wallet_id: string;
      to_wallet_id: string;
    },
    dto: UpdateTransferDto,
  ): TransferValues {
    return this.validateTransferValues({
      from_wallet_id: dto.from_wallet_id ?? existing.from_wallet_id,
      to_wallet_id: dto.to_wallet_id ?? existing.to_wallet_id,
      amount:
        dto.amount !== undefined
          ? new Prisma.Decimal(dto.amount)
          : new Prisma.Decimal(existing.amount),
      transfer_date:
        dto.transfer_date ?? existing.transfer_date.toISOString().split('T')[0],
      note: dto.note !== undefined ? dto.note?.trim() || null : existing.note,
    });
  }

  private validateTransferValues(values: TransferValues): TransferValues {
    if (values.from_wallet_id === values.to_wallet_id) {
      throw new BadRequestException('Source and destination wallets must be different');
    }

    if (values.amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    this.assertNotFutureDate(values.transfer_date);

    return values;
  }

  private async getTransferWallets(
    tx: PrismaTransaction,
    userId: string,
    fromWalletId: string,
    toWalletId: string,
  ) {
    const wallets = await tx.wallets.findMany({
      where: {
        id: { in: [fromWalletId, toWalletId] },
        user_id: userId,
        deleted_at: null,
      },
    });

    const fromWallet = wallets.find((wallet) => wallet.id === fromWalletId);
    const toWallet = wallets.find((wallet) => wallet.id === toWalletId);

    if (!fromWallet) {
      throw new NotFoundException('Source wallet not found');
    }

    if (!toWallet) {
      throw new NotFoundException('Destination wallet not found');
    }

    return { fromWallet, toWallet };
  }

  private async applyTransferBalance(
    tx: PrismaTransaction,
    userId: string,
    values: Pick<TransferValues, 'from_wallet_id' | 'to_wallet_id' | 'amount'>,
  ) {
    const decrementSource = await tx.wallets.updateMany({
      where: {
        id: values.from_wallet_id,
        user_id: userId,
        deleted_at: null,
        balance: { gte: values.amount },
      },
      data: {
        balance: { decrement: values.amount },
        updated_at: new Date(),
      },
    });

    if (decrementSource.count !== 1) {
      throw new BadRequestException('Source wallet balance is not enough');
    }

    await tx.wallets.update({
      where: { id: values.to_wallet_id },
      data: {
        balance: { increment: values.amount },
        updated_at: new Date(),
      },
    });
  }

  private async reverseTransferBalance(
    tx: PrismaTransaction,
    userId: string,
    values: Pick<TransferValues, 'from_wallet_id' | 'to_wallet_id' | 'amount'>,
  ) {
    const decrementDestination = await tx.wallets.updateMany({
      where: {
        id: values.to_wallet_id,
        user_id: userId,
        deleted_at: null,
        balance: { gte: values.amount },
      },
      data: {
        balance: { decrement: values.amount },
        updated_at: new Date(),
      },
    });

    if (decrementDestination.count !== 1) {
      throw new BadRequestException(
        'Destination wallet balance is not enough to reverse this transfer',
      );
    }

    await tx.wallets.update({
      where: { id: values.from_wallet_id },
      data: {
        balance: { increment: values.amount },
        updated_at: new Date(),
      },
    });
  }

  private assertNotFutureDate(dateString: string) {
    const transferDate = dateString.split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    if (transferDate > today) {
      throw new BadRequestException('Transfer date cannot be in the future');
    }
  }

  private toTransferDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid transfer date');
    }

    return date;
  }

  private getFromTransactionName(destinationWalletName: string) {
    return `Transfer to ${destinationWalletName}`;
  }

  private getToTransactionName(sourceWalletName: string) {
    return `Transfer from ${sourceWalletName}`;
  }
}
