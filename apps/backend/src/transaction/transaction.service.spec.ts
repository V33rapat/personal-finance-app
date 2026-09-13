import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import * as walletBalance from '../wallet/wallet-balance.util';

const USER_ID = 'user-1';
const TRANSACTION_ID = 'transaction-1';
const SOURCE_WALLET_ID = 'wallet-source';
const DESTINATION_WALLET_ID = 'wallet-destination';

function createTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: TRANSACTION_ID,
    wallet_id: SOURCE_WALLET_ID,
    category_id: null,
    template_id: null,
    name: 'Salary',
    type: 'income',
    amount: 100,
    note: null,
    transaction_date: new Date('2026-07-01T00:00:00.000Z'),
    created_at: new Date('2026-07-01T00:00:00.000Z'),
    updated_at: new Date('2026-07-01T00:00:00.000Z'),
    deleted_at: null,
    categories: null,
    wallets: { id: SOURCE_WALLET_ID, name: 'Source wallet' },
    ...overrides,
  };
}

describe('TransactionService', () => {
  let service: TransactionService;
  let prisma: {
    transactions: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    transfers: {
      findFirst: jest.Mock;
    };
    wallets: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let transactionClient: {
    transactions: {
      update: jest.Mock;
    };
  };
  let applyBalanceDelta: jest.SpiedFunction<
    typeof walletBalance.applyWalletBalanceDelta
  >;

  beforeEach(() => {
    transactionClient = {
      transactions: {
        update: jest.fn(),
      },
    };
    prisma = {
      transactions: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      transfers: {
        findFirst: jest.fn(),
      },
      wallets: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((input: unknown) => {
        if (Array.isArray(input)) {
          return Promise.all(input);
        }

        return (
          input as (client: typeof transactionClient) => Promise<unknown>
        )(transactionClient);
      }),
    };
    service = new TransactionService(prisma as unknown as PrismaService);
    applyBalanceDelta = jest
      .spyOn(walletBalance, 'applyWalletBalanceDelta')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockEligibleDestination(walletId = DESTINATION_WALLET_ID) {
    prisma.wallets.findFirst
      .mockResolvedValueOnce({ id: walletId })
      .mockResolvedValueOnce(null);
  }

  function mockUpdatableTransaction(
    transaction = createTransaction(),
    updatedTransaction = createTransaction({
      wallet_id: DESTINATION_WALLET_ID,
      wallets: { id: DESTINATION_WALLET_ID, name: 'Destination wallet' },
    }),
  ) {
    prisma.transactions.findFirst.mockResolvedValue(transaction);
    prisma.transfers.findFirst.mockResolvedValue(null);
    transactionClient.transactions.update.mockResolvedValue(updatedTransaction);
  }

  it('moves income between wallets by reversing the source and applying the destination', async () => {
    mockUpdatableTransaction();
    mockEligibleDestination();

    await service.update(
      USER_ID,
      { wallet_id: DESTINATION_WALLET_ID },
      TRANSACTION_ID,
    );

    const [[updateOptions]] = transactionClient.transactions.update.mock
      .calls as unknown as [
      [
        {
          data: { wallet_id?: string };
          include: { categories: boolean; wallets: boolean };
        },
      ],
    ][];

    expect(updateOptions).toMatchObject({
      data: { wallet_id: DESTINATION_WALLET_ID },
      include: { categories: true, wallets: true },
    });
    expect(applyBalanceDelta).toHaveBeenNthCalledWith(
      1,
      transactionClient,
      SOURCE_WALLET_ID,
      -100,
    );
    expect(applyBalanceDelta).toHaveBeenNthCalledWith(
      2,
      transactionClient,
      DESTINATION_WALLET_ID,
      100,
    );
  });

  it('moves an expense between sibling wallets without changing their shared parent total', async () => {
    mockUpdatableTransaction(
      createTransaction({ type: 'expense', amount: 100 }),
      createTransaction({
        type: 'expense',
        amount: 100,
        wallet_id: DESTINATION_WALLET_ID,
      }),
    );
    mockEligibleDestination();

    await service.update(
      USER_ID,
      { wallet_id: DESTINATION_WALLET_ID },
      TRANSACTION_ID,
    );

    expect(applyBalanceDelta).toHaveBeenNthCalledWith(
      1,
      transactionClient,
      SOURCE_WALLET_ID,
      100,
    );
    expect(applyBalanceDelta).toHaveBeenNthCalledWith(
      2,
      transactionClient,
      DESTINATION_WALLET_ID,
      -100,
    );
  });

  it('applies the edited amount and type to the destination wallet', async () => {
    mockUpdatableTransaction();
    mockEligibleDestination();

    await service.update(
      USER_ID,
      {
        wallet_id: DESTINATION_WALLET_ID,
        amount: 250,
        type: 'expense',
      },
      TRANSACTION_ID,
    );

    expect(applyBalanceDelta).toHaveBeenNthCalledWith(
      1,
      transactionClient,
      SOURCE_WALLET_ID,
      -100,
    );
    expect(applyBalanceDelta).toHaveBeenNthCalledWith(
      2,
      transactionClient,
      DESTINATION_WALLET_ID,
      -250,
    );
  });

  it('uses one balance delta when the wallet is unchanged', async () => {
    mockUpdatableTransaction(
      createTransaction(),
      createTransaction({ amount: 200 }),
    );
    mockEligibleDestination(SOURCE_WALLET_ID);

    await service.update(USER_ID, { amount: 200 }, TRANSACTION_ID);

    expect(applyBalanceDelta).toHaveBeenCalledTimes(1);
    expect(applyBalanceDelta).toHaveBeenCalledWith(
      transactionClient,
      SOURCE_WALLET_ID,
      100,
    );
  });

  it('rejects an inactive or unavailable destination wallet', async () => {
    mockUpdatableTransaction();
    prisma.wallets.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.update(
        USER_ID,
        { wallet_id: DESTINATION_WALLET_ID },
        TRANSACTION_ID,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    const [[walletQuery]] = prisma.wallets.findFirst.mock.calls as unknown as [
      [
        {
          where: {
            id: string;
            user_id: string;
            deleted_at: null;
            is_active: boolean;
          };
        },
      ],
    ][];

    expect(walletQuery).toMatchObject({
      where: {
        id: DESTINATION_WALLET_ID,
        user_id: USER_ID,
        deleted_at: null,
        is_active: true,
      },
    });
  });

  it('rejects a parent wallet that has an active sub-wallet', async () => {
    mockUpdatableTransaction();
    prisma.wallets.findFirst
      .mockResolvedValueOnce({ id: DESTINATION_WALLET_ID })
      .mockResolvedValueOnce({ id: 'sub-wallet-1' });

    await expect(
      service.update(
        USER_ID,
        { wallet_id: DESTINATION_WALLET_ID },
        TRANSACTION_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects edits to transactions managed by a transfer', async () => {
    prisma.transactions.findFirst.mockResolvedValue(createTransaction());
    prisma.transfers.findFirst.mockResolvedValue({ id: 'transfer-1' });

    await expect(
      service.update(
        USER_ID,
        { wallet_id: DESTINATION_WALLET_ID },
        TRANSACTION_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.wallets.findFirst).not.toHaveBeenCalled();
  });

  it('uses the eligible wallet rule when creating a transaction', async () => {
    prisma.wallets.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.create(
        {
          wallet_id: DESTINATION_WALLET_ID,
          name: 'Coffee',
          amount: 50,
          type: 'expense',
          transaction_date: '2026-07-01',
        },
        USER_ID,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    const [[walletQuery]] = prisma.wallets.findFirst.mock.calls as unknown as [
      [
        {
          where: {
            id: string;
            user_id: string;
            deleted_at: null;
            is_active: boolean;
          };
        },
      ],
    ][];

    expect(walletQuery).toMatchObject({
      where: {
        id: DESTINATION_WALLET_ID,
        user_id: USER_ID,
        deleted_at: null,
        is_active: true,
      },
    });
  });

  it('adds management metadata to every transaction returned by findAll', async () => {
    prisma.transactions.findMany.mockResolvedValue([
      createTransaction({ name: 'Manual transaction' }),
      createTransaction({
        id: 'transfer-transaction',
        name: 'Transfer transaction',
        transfers_transfers_from_transaction_idTotransactions: {
          allocation_id: null,
        },
        transfers_transfers_to_transaction_idTotransactions: null,
      }),
      createTransaction({
        id: 'allocation-transaction',
        name: 'Allocation transaction',
        transfers_transfers_from_transaction_idTotransactions: null,
        transfers_transfers_to_transaction_idTotransactions: {
          allocation_id: 'allocation-1',
        },
      }),
    ]);

    const result = await service.findAll(USER_ID);

    expect(result.map((transaction) => transaction.management)).toEqual([
      'manual',
      'transfer',
      'allocation',
    ]);
    expect(prisma.transactions.findMany).toHaveBeenCalledWith({
      where: { wallets: { user_id: USER_ID }, deleted_at: null },
      include: {
        categories: true,
        wallets: true,
        transfers_transfers_from_transaction_idTotransactions: {
          select: { allocation_id: true },
        },
        transfers_transfers_to_transaction_idTotransactions: {
          select: { allocation_id: true },
        },
      },
      orderBy: { transaction_date: 'desc' },
    });
  });

  it('keeps findAll scoped to the requested user wallet', async () => {
    prisma.transactions.findMany.mockResolvedValue([]);

    await service.findAll(USER_ID, SOURCE_WALLET_ID);

    expect(prisma.transactions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          wallets: {
            user_id: USER_ID,
            id: SOURCE_WALLET_ID,
          },
          deleted_at: null,
        },
      }),
    );
  });

  it('rejects future transaction dates before creating or updating records', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse('2026-07-30T12:00:00.000Z'));

    try {
      await expect(
        service.create(
          {
            wallet_id: SOURCE_WALLET_ID,
            name: 'Future income',
            amount: 100,
            type: 'income',
            transaction_date: '2026-07-31',
          },
          USER_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.update(
          USER_ID,
          { transaction_date: '2026-07-31' },
          TRANSACTION_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.transactions.findFirst).not.toHaveBeenCalled();
      expect(prisma.wallets.findFirst).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects deleting a transaction managed by a money allocation', async () => {
    prisma.transactions.findFirst.mockResolvedValue(createTransaction());
    prisma.transfers.findFirst.mockResolvedValue({ id: 'transfer-1' });

    await expect(
      service.delete(USER_ID, TRANSACTION_ID),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.wallets.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns one filtered daily page while keeping the summary unfiltered', async () => {
    prisma.wallets.findFirst.mockResolvedValue({ id: SOURCE_WALLET_ID });
    prisma.transactions.groupBy.mockResolvedValue([
      { type: 'income', _sum: { amount: 200 } },
      { type: 'expense', _sum: { amount: 75 } },
    ]);
    prisma.transactions.count.mockResolvedValue(51);
    prisma.transactions.findMany.mockResolvedValue([
      createTransaction({
        type: 'expense',
        amount: 75,
        name: 'Coffee',
        transfers_transfers_from_transaction_idTotransactions: {
          allocation_id: null,
        },
        transfers_transfers_to_transaction_idTotransactions: null,
      }),
    ]);

    const result = await service.findDaily(USER_ID, {
      walletId: SOURCE_WALLET_ID,
      date: '2026-07-01',
      type: 'expense',
      search: 'coffee',
    });

    expect(result).toMatchObject({
      date: '2026-07-01',
      summary: { income: '200.00', expense: '75.00', net: '125.00' },
      page: 1,
      has_more: true,
    });
    expect(result.items[0]?.management).toBe('transfer');

    expect(prisma.transactions.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          wallet_id: SOURCE_WALLET_ID,
          deleted_at: null,
          transaction_date: new Date('2026-07-01T00:00:00.000Z'),
        },
      }),
    );
    const countCalls = prisma.transactions.count.mock.calls as unknown as Array<
      [
        {
          where: {
            type: string;
            OR: unknown[];
          };
        },
      ]
    >;
    const countOptions = countCalls[0]?.[0];

    expect(countOptions?.where.type).toBe('expense');
    expect(countOptions?.where.OR).toHaveLength(2);
    expect(prisma.transactions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 50,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('marks allocation transactions as managed by an allocation', async () => {
    prisma.wallets.findFirst.mockResolvedValue({ id: SOURCE_WALLET_ID });
    prisma.transactions.groupBy.mockResolvedValue([]);
    prisma.transactions.count.mockResolvedValue(1);
    prisma.transactions.findMany.mockResolvedValue([
      createTransaction({
        transfers_transfers_from_transaction_idTotransactions: null,
        transfers_transfers_to_transaction_idTotransactions: {
          allocation_id: 'allocation-1',
        },
      }),
    ]);

    const result = await service.findDaily(USER_ID, {
      walletId: SOURCE_WALLET_ID,
      date: '2026-07-01',
      page: 2,
    });

    expect(result.items[0]?.management).toBe('allocation');
    expect(result.has_more).toBe(false);
    expect(prisma.transactions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 50, take: 50 }),
    );
  });
});
