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
      },
      transfers: {
        findFirst: jest.fn(),
      },
      wallets: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(
        (callback: (client: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      ),
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
});
