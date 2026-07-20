import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllocationService } from './allocation.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransferService } from '../transfer/transfer.service';

const createdAt = new Date('2026-07-20T00:00:00.000Z');

function createAllocationRecord() {
  return {
    id: 'allocation-1',
    user_id: 'user-1',
    source_wallet_id: 'wallet-source',
    amount: new Prisma.Decimal(1000),
    allocation_date: new Date('2026-07-20T00:00:00.000Z'),
    note: 'แบ่งเงินออม',
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
    wallets_money_allocations_source_wallet_idTowallets: {
      id: 'wallet-source',
      name: 'เงินเดือน',
    },
    transfers: [
      {
        id: 'transfer-1',
        allocation_id: 'allocation-1',
        from_wallet_id: 'wallet-source',
        to_wallet_id: 'wallet-saving',
        from_transaction_id: 'transaction-1',
        to_transaction_id: 'transaction-2',
        amount: new Prisma.Decimal(600),
        wallets_transfers_to_wallet_idTowallets: {
          id: 'wallet-saving',
          name: 'เงินออม',
        },
      },
      {
        id: 'transfer-2',
        allocation_id: 'allocation-1',
        from_wallet_id: 'wallet-source',
        to_wallet_id: 'wallet-investment',
        from_transaction_id: 'transaction-3',
        to_transaction_id: 'transaction-4',
        amount: new Prisma.Decimal(400),
        wallets_transfers_to_wallet_idTowallets: {
          id: 'wallet-investment',
          name: 'ลงทุน',
        },
      },
    ],
  };
}

describe('AllocationService', () => {
  let service: AllocationService;
  let prisma: {
    $transaction: jest.Mock;
    money_allocations: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    wallets: { findMany: jest.Mock; findFirst: jest.Mock };
  };
  let transferService: {
    createInTransaction: jest.Mock;
    reverseAndSoftDeleteInTransaction: jest.Mock;
    updateMetadataInTransaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      money_allocations: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      wallets: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    transferService = {
      createInTransaction: jest.fn(),
      reverseAndSoftDeleteInTransaction: jest.fn(),
      updateMetadataInTransaction: jest.fn(),
    };
    service = new AllocationService(
      prisma as unknown as PrismaService,
      transferService as unknown as TransferService,
    );
  });

  it('creates one transfer per destination in the same transaction', async () => {
    const record = createAllocationRecord();
    prisma.wallets.findMany.mockResolvedValue([
      { id: 'wallet-source' },
      { id: 'wallet-saving' },
      { id: 'wallet-investment' },
    ]);
    prisma.wallets.findFirst.mockResolvedValue(null);
    prisma.money_allocations.create.mockResolvedValue({ id: record.id });
    prisma.money_allocations.findFirst.mockResolvedValue(record);

    const result = await service.create('user-1', {
      source_wallet_id: 'wallet-source',
      amount: 1000,
      allocation_date: '2026-07-20',
      note: 'แบ่งเงินออม',
      destinations: [
        { wallet_id: 'wallet-saving', amount: 600 },
        { wallet_id: 'wallet-investment', amount: 400 },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transferService.createInTransaction).toHaveBeenCalledTimes(2);
    expect(transferService.createInTransaction).toHaveBeenNthCalledWith(
      1,
      prisma,
      'user-1',
      expect.objectContaining({
        from_wallet_id: 'wallet-source',
        to_wallet_id: 'wallet-saving',
        amount: new Prisma.Decimal(600),
      }),
      record.id,
    );
    expect(result).toMatchObject({
      id: record.id,
      source_wallet_name: 'เงินเดือน',
      amount: '1000',
      destinations: [
        { wallet_id: 'wallet-saving', amount: '600' },
        { wallet_id: 'wallet-investment', amount: '400' },
      ],
    });
  });

  it('rejects allocations whose destination amounts do not match the total', async () => {
    await expect(
      service.create('user-1', {
        source_wallet_id: 'wallet-source',
        amount: 1000,
        allocation_date: '2026-07-20',
        destinations: [{ wallet_id: 'wallet-saving', amount: 999 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a parent wallet that has an active sub-wallet', async () => {
    prisma.wallets.findMany.mockResolvedValue([
      { id: 'wallet-source' },
      { id: 'wallet-saving' },
    ]);
    prisma.wallets.findFirst.mockResolvedValue({ id: 'active-child' });

    await expect(
      service.create('user-1', {
        source_wallet_id: 'wallet-source',
        amount: 1000,
        allocation_date: '2026-07-20',
        destinations: [{ wallet_id: 'wallet-saving', amount: 1000 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(transferService.createInTransaction).not.toHaveBeenCalled();
  });

  it('updates only the allocation and child transfer metadata when balances are unchanged', async () => {
    const record = createAllocationRecord();
    prisma.money_allocations.findFirst.mockResolvedValue(record);
    prisma.money_allocations.update.mockResolvedValue(record);

    await service.update('user-1', record.id, {
      allocation_date: '2026-07-19',
      note: 'ปรับวันที่',
    });

    expect(transferService.reverseAndSoftDeleteInTransaction).not.toHaveBeenCalled();
    expect(transferService.createInTransaction).not.toHaveBeenCalled();
    expect(transferService.updateMetadataInTransaction).toHaveBeenCalledTimes(2);
    expect(prisma.money_allocations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: record.id },
        data: expect.objectContaining({
          allocation_date: new Date('2026-07-19T00:00:00.000Z'),
          note: 'ปรับวันที่',
        }),
      }),
    );
  });
});
