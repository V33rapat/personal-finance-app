import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TransferService, type PrismaTransaction } from './transfer.service';

interface WalletFixture {
  id: string;
  name: string;
  parent_wallet_id: string | null;
}

function createTransactionMock(wallets: WalletFixture[]) {
  const walletById = new Map(wallets.map((wallet) => [wallet.id, wallet]));
  let createdTransactionCount = 0;

  const delegates = {
    wallets: {
      findMany: jest.fn().mockResolvedValue(wallets),
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve({
            parent_wallet_id:
              walletById.get(where.id)?.parent_wallet_id ?? null,
          }),
        ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest
        .fn()
        .mockImplementation(
          ({ where, select }: { where: { id: string }; select?: object }) =>
            Promise.resolve(
              select
                ? {
                    parent_wallet_id:
                      walletById.get(where.id)?.parent_wallet_id ?? null,
                  }
                : {},
            ),
        ),
    },
    transactions: {
      create: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ id: `transaction-${++createdTransactionCount}` }),
        ),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    transfers: {
      create: jest.fn().mockResolvedValue({ id: 'transfer-1' }),
      update: jest.fn(),
    },
  };

  return {
    tx: delegates as unknown as PrismaTransaction,
    delegates,
  };
}

function createValues(fromWalletId: string, toWalletId: string) {
  return {
    from_wallet_id: fromWalletId,
    to_wallet_id: toWalletId,
    amount: new Prisma.Decimal(100),
    transfer_date: '2025-12-15',
    note: null,
  };
}

function expectWalletEligibilityFilter(
  findMany: jest.Mock,
  walletIds: string[],
) {
  expect(findMany).toHaveBeenCalledWith({
    where: {
      id: { in: walletIds },
      user_id: 'user-1',
      deleted_at: null,
      is_active: true,
      other_wallets: {
        none: { is_active: true, deleted_at: null },
      },
    },
  });
}

describe('TransferService', () => {
  it('rejects deleting a transfer managed by a money allocation', async () => {
    const service = new TransferService({} as PrismaService);
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'transfer-1',
      allocation_id: 'allocation-1',
    } as Awaited<ReturnType<TransferService['findOne']>>);

    await expect(service.delete('user-1', 'transfer-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([
    {
      label: 'Parent source',
      fromWalletId: 'parent',
      toWalletId: 'destination',
      eligibleWallets: [
        { id: 'destination', name: 'Destination', parent_wallet_id: null },
      ],
    },
    {
      label: 'Parent destination',
      fromWalletId: 'source',
      toWalletId: 'parent',
      eligibleWallets: [
        { id: 'source', name: 'Source', parent_wallet_id: null },
      ],
    },
    {
      label: 'inactive source',
      fromWalletId: 'inactive',
      toWalletId: 'destination',
      eligibleWallets: [
        { id: 'destination', name: 'Destination', parent_wallet_id: null },
      ],
    },
    {
      label: 'inactive destination',
      fromWalletId: 'source',
      toWalletId: 'inactive',
      eligibleWallets: [
        { id: 'source', name: 'Source', parent_wallet_id: null },
      ],
    },
  ])('rejects a transfer with an ineligible $label', async (testCase) => {
    const { tx, delegates } = createTransactionMock(testCase.eligibleWallets);
    const service = new TransferService({} as PrismaService);

    await expect(
      service.createInTransaction(
        tx,
        'user-1',
        createValues(testCase.fromWalletId, testCase.toWalletId),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expectWalletEligibilityFilter(delegates.wallets.findMany, [
      testCase.fromWalletId,
      testCase.toWalletId,
    ]);
    expect(delegates.wallets.updateMany).not.toHaveBeenCalled();
    expect(delegates.transactions.create).not.toHaveBeenCalled();
    expect(delegates.transfers.create).not.toHaveBeenCalled();
  });

  it('creates a transfer between an active standalone wallet and sub-wallet', async () => {
    const { tx, delegates } = createTransactionMock([
      { id: 'source', name: 'Cash', parent_wallet_id: null },
      { id: 'destination', name: 'Travel', parent_wallet_id: 'parent' },
    ]);
    const service = new TransferService({} as PrismaService);

    const result = await service.createInTransaction(
      tx,
      'user-1',
      createValues('source', 'destination'),
    );

    expect(result).toEqual({ id: 'transfer-1' });
    expect(delegates.transactions.create).toHaveBeenCalledTimes(2);
    expect(delegates.transfers.create).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      field: 'wallet',
      patch: { to_wallet_id: 'parent' },
      walletIds: ['source', 'parent'],
    },
    {
      field: 'amount',
      patch: { amount: 125 },
      walletIds: ['source', 'old-destination'],
    },
  ])(
    'rejects an update that changes the $field when a wallet is ineligible',
    async ({ patch, walletIds }) => {
      const { tx, delegates } = createTransactionMock([
        { id: 'source', name: 'Cash', parent_wallet_id: null },
      ]);
      const prisma = {
        $transaction: jest.fn(
          (callback: (transaction: PrismaTransaction) => unknown) =>
            callback(tx),
        ),
      } as unknown as PrismaService;
      const service = new TransferService(prisma);
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'transfer-1',
        allocation_id: null,
        from_wallet_id: 'source',
        to_wallet_id: 'old-destination',
        amount: new Prisma.Decimal(100),
        transfer_date: new Date('2025-12-15T00:00:00.000Z'),
        note: null,
        from_transaction_id: 'expense-1',
        to_transaction_id: 'income-1',
      } as Awaited<ReturnType<TransferService['findOne']>>);

      await expect(
        service.update('user-1', 'transfer-1', patch),
      ).rejects.toBeInstanceOf(NotFoundException);

      expectWalletEligibilityFilter(delegates.wallets.findMany, walletIds);
      expect(delegates.wallets.updateMany).not.toHaveBeenCalled();
      expect(delegates.transactions.update).not.toHaveBeenCalled();
    },
  );
});
