import { BadRequestException } from '@nestjs/common';
import {
  Prisma,
  spending_budget_period,
  spending_budget_wallet_scope,
  wallet_type,
} from '@prisma/client';

function createBudgetWallet(
  overrides: Partial<{
    wallet_id: string;
    is_active: boolean;
    deleted_at: Date | null;
    wallet_type: wallet_type;
    parent_name: string | null;
    active_children: Array<{ id: string }>;
  }> = {},
) {
  const values = {
    wallet_id: 'wallet-1',
    is_active: true,
    deleted_at: null,
    wallet_type: wallet_type.normal,
    parent_name: null,
    active_children: [],
    ...overrides,
  };

  return {
    wallet_id: values.wallet_id,
    wallets: {
      id: values.wallet_id,
      name: values.wallet_id,
      wallet_type: values.wallet_type,
      is_active: values.is_active,
      deleted_at: values.deleted_at,
      wallets: values.parent_name ? { name: values.parent_name } : null,
      other_wallets: values.active_children,
    },
  };
}
import { PrismaService } from '../prisma/prisma.service';
import { SpendingBudgetService } from './spending-budget.service';

function createBudget(
  overrides: Partial<{
    id: string;
    amount: Prisma.Decimal;
    period: spending_budget_period;
    wallet_scope: spending_budget_wallet_scope;
    includes_uncategorized: boolean;
    spending_budget_categories: Array<{
      category_id: string;
      categories: { id: string; name: string; color: string | null };
    }>;
    spending_budget_wallets: ReturnType<typeof createBudgetWallet>[];
  }> = {},
) {
  return {
    id: 'budget-1',
    user_id: 'user-1',
    name: 'ค่าใช้จ่ายจำเป็น',
    amount: new Prisma.Decimal(180),
    period: spending_budget_period.daily,
    wallet_scope: spending_budget_wallet_scope.all,
    includes_uncategorized: false,
    is_active: true,
    created_at: new Date('2026-07-01T00:00:00.000Z'),
    updated_at: new Date('2026-07-01T00:00:00.000Z'),
    spending_budget_categories: [
      {
        category_id: 'category-food',
        categories: { id: 'category-food', name: 'อาหาร', color: '#10B981' },
      },
    ],
    spending_budget_wallets: [],
    ...overrides,
  };
}

describe('SpendingBudgetService', () => {
  let service: SpendingBudgetService;
  let prisma: {
    $transaction: jest.Mock;
    categories: { findMany: jest.Mock };
    wallets: { findMany: jest.Mock };
    transactions: { groupBy: jest.Mock };
    spending_budgets: {
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      categories: { findMany: jest.fn() },
      wallets: { findMany: jest.fn() },
      transactions: { groupBy: jest.fn() },
      spending_budgets: {
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    service = new SpendingBudgetService(prisma as unknown as PrismaService);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-20T05:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calculates a current daily overview from normal active wallets only', async () => {
    prisma.spending_budgets.findMany.mockResolvedValue([createBudget()]);
    prisma.transactions.groupBy.mockResolvedValue([
      {
        category_id: 'category-food',
        wallet_id: 'wallet-1',
        _sum: { amount: new Prisma.Decimal(145) },
      },
    ]);

    await expect(
      service.getOverview('user-1', {
        period: spending_budget_period.daily,
      }),
    ).resolves.toEqual({
      period: 'daily',
      period_start: '2026-07-20',
      period_end: '2026-07-20',
      budgets: [
        expect.objectContaining({
          id: 'budget-1',
          spent: '145.00',
          remaining: '35.00',
          percentage: 80.56,
          status: 'near_limit',
        }),
      ],
    });

    expect(prisma.transactions.groupBy).toHaveBeenCalledWith({
      by: ['category_id', 'wallet_id'],
      where: {
        deleted_at: null,
        type: 'expense',
        transaction_date: {
          gte: new Date('2026-07-20T00:00:00.000Z'),
          lt: new Date('2026-07-21T00:00:00.000Z'),
        },
        wallets: {
          user_id: 'user-1',
          wallet_type: 'normal',
          is_active: true,
          deleted_at: null,
          created_at: { lt: new Date('2026-07-21T00:00:00.000Z') },
          other_wallets: {
            none: { is_active: true, deleted_at: null },
          },
        },
        transfers_transfers_from_transaction_idTotransactions: { is: null },
        transfers_transfers_to_transaction_idTotransactions: { is: null },
      },
      _sum: { amount: true },
    });
  });

  it('adds uncategorized expenses only to budgets that select them', async () => {
    prisma.spending_budgets.findMany.mockResolvedValue([
      createBudget(),
      createBudget({
        id: 'budget-2',
        includes_uncategorized: true,
        amount: new Prisma.Decimal(200),
      }),
    ]);
    prisma.transactions.groupBy.mockResolvedValue([
      {
        category_id: 'category-food',
        wallet_id: 'wallet-1',
        _sum: { amount: new Prisma.Decimal(100) },
      },
      {
        category_id: null,
        wallet_id: 'wallet-1',
        _sum: { amount: new Prisma.Decimal(30) },
      },
    ]);

    const overview = await service.getOverview('user-1', {
      period: spending_budget_period.daily,
    });

    expect(overview.budgets).toEqual([
      expect.objectContaining({ id: 'budget-1', spent: '100.00' }),
      expect.objectContaining({ id: 'budget-2', spent: '130.00' }),
    ]);
  });

  it('creates an all-wallet budget without stored wallet selections', async () => {
    prisma.categories.findMany.mockResolvedValue([{ id: 'category-food' }]);
    prisma.spending_budgets.findMany.mockResolvedValue([]);
    prisma.spending_budgets.create.mockResolvedValue(createBudget());

    await expect(
      service.create('user-1', {
        name: 'ค่าอาหาร',
        amount: 180,
        period: spending_budget_period.daily,
        wallet_scope: spending_budget_wallet_scope.all,
        wallet_ids: [],
        category_ids: ['category-food'],
        includes_uncategorized: false,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        wallet_scope: spending_budget_wallet_scope.all,
        wallets: [],
      }),
    );

    expect(prisma.wallets.findMany).not.toHaveBeenCalled();
    expect(prisma.spending_budgets.create).toHaveBeenCalledTimes(1);
  });

  it('creates a selected-wallet budget after validating normal transaction wallets', async () => {
    prisma.categories.findMany.mockResolvedValue([{ id: 'category-food' }]);
    prisma.wallets.findMany.mockResolvedValue([{ id: 'wallet-1' }]);
    prisma.spending_budgets.findMany.mockResolvedValue([]);
    prisma.spending_budgets.create.mockResolvedValue(
      createBudget({
        wallet_scope: spending_budget_wallet_scope.selected,
        spending_budget_wallets: [createBudgetWallet()],
      }),
    );

    await service.create('user-1', {
      name: 'ค่าอาหารเงินสด',
      amount: 180,
      period: spending_budget_period.daily,
      wallet_scope: spending_budget_wallet_scope.selected,
      wallet_ids: ['wallet-1'],
      category_ids: ['category-food'],
      includes_uncategorized: false,
    });

    expect(prisma.wallets.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['wallet-1'] },
        user_id: 'user-1',
        wallet_type: wallet_type.normal,
        is_active: true,
        deleted_at: null,
        other_wallets: {
          none: { is_active: true, deleted_at: null },
        },
      },
      select: { id: true },
    });
    expect(prisma.spending_budgets.create).toHaveBeenCalledTimes(1);
  });

  it('rejects selected wallet scopes without an available transaction wallet', async () => {
    prisma.categories.findMany.mockResolvedValue([{ id: 'category-food' }]);
    prisma.wallets.findMany.mockResolvedValue([]);

    await expect(
      service.create('user-1', {
        name: 'ค่าอาหาร',
        amount: 180,
        period: spending_budget_period.daily,
        wallet_scope: spending_budget_wallet_scope.selected,
        wallet_ids: ['wallet-inactive'],
        category_ids: ['category-food'],
        includes_uncategorized: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.spending_budgets.create).not.toHaveBeenCalled();
  });

  it('rejects all-wallet budgets that send selected wallet ids', async () => {
    prisma.categories.findMany.mockResolvedValue([{ id: 'category-food' }]);

    await expect(
      service.create('user-1', {
        name: 'ค่าอาหาร',
        amount: 180,
        period: spending_budget_period.daily,
        wallet_scope: spending_budget_wallet_scope.all,
        wallet_ids: ['wallet-1'],
        category_ids: ['category-food'],
        includes_uncategorized: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate active budget with the same category and wallet scope', async () => {
    prisma.categories.findMany.mockResolvedValue([{ id: 'category-food' }]);
    prisma.spending_budgets.findMany.mockResolvedValue([createBudget()]);

    await expect(
      service.create('user-1', {
        name: 'งบชื่ออื่น',
        amount: 300,
        period: spending_budget_period.daily,
        wallet_scope: spending_budget_wallet_scope.all,
        wallet_ids: [],
        category_ids: ['category-food'],
        includes_uncategorized: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('calculates selected-wallet totals and warns about unavailable selections', async () => {
    prisma.spending_budgets.findMany.mockResolvedValue([
      createBudget({
        wallet_scope: spending_budget_wallet_scope.selected,
        spending_budget_wallets: [
          createBudgetWallet({ wallet_id: 'wallet-1' }),
          createBudgetWallet({
            wallet_id: 'wallet-2',
            is_active: false,
          }),
        ],
      }),
    ]);
    prisma.transactions.groupBy.mockResolvedValue([
      {
        category_id: 'category-food',
        wallet_id: 'wallet-1',
        _sum: { amount: new Prisma.Decimal(120) },
      },
      {
        category_id: 'category-food',
        wallet_id: 'wallet-2',
        _sum: { amount: new Prisma.Decimal(80) },
      },
    ]);

    const overview = await service.getOverview('user-1', {
      period: spending_budget_period.daily,
    });
    const [budget] = overview.budgets;

    expect(budget).toEqual(
      expect.objectContaining({
        spent: '120.00',
        unavailable_wallet_count: 1,
      }),
    );
    expect(budget.wallets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'wallet-2',
          is_available: false,
        }),
      ]),
    );
  });

  it('does not query transactions when the selected period has no active budgets', async () => {
    prisma.spending_budgets.findMany.mockResolvedValue([]);

    await expect(
      service.getOverview('user-1', {
        period: spending_budget_period.yearly,
      }),
    ).resolves.toEqual({
      period: 'yearly',
      period_start: '2026-01-01',
      period_end: '2026-12-31',
      budgets: [],
    });

    expect(prisma.transactions.groupBy).not.toHaveBeenCalled();
  });

  it('rejects a budget that has no category and excludes uncategorized expenses', async () => {
    await expect(
      service.create('user-1', {
        name: 'ค่าใช้จ่าย',
        amount: 100,
        period: spending_budget_period.daily,
        wallet_scope: spending_budget_wallet_scope.all,
        wallet_ids: [],
        category_ids: [],
        includes_uncategorized: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.spending_budgets.create).not.toHaveBeenCalled();
  });

  it('pauses active budgets that no longer have any budget source', async () => {
    const updateMany = jest.fn();
    const transaction = {
      spending_budgets: { updateMany },
    };

    await service.pauseEmptyBudgets(
      transaction as unknown as Prisma.TransactionClient,
      'user-1',
    );

    const updateCalls = updateMany.mock.calls as unknown as Array<
      [Prisma.spending_budgetsUpdateManyArgs]
    >;
    const updateArgument = updateCalls[0]?.[0];

    expect(updateArgument?.where).toEqual({
      user_id: 'user-1',
      is_active: true,
      includes_uncategorized: false,
      spending_budget_categories: { none: {} },
    });
    expect(updateArgument?.data).toMatchObject({ is_active: false });
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it('uses a selected day, including a future day, for the daily overview', async () => {
    prisma.spending_budgets.findMany.mockResolvedValue([createBudget()]);
    prisma.transactions.groupBy.mockResolvedValue([]);

    await expect(
      service.getOverview('user-1', {
        period: spending_budget_period.daily,
        date: '2026-08-15',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        period_start: '2026-08-15',
        period_end: '2026-08-15',
      }),
    );

    const groupByCalls = prisma.transactions.groupBy.mock
      .calls as unknown as Array<[Prisma.transactionsGroupByArgs]>;
    const groupByArgument = groupByCalls[0]?.[0];

    expect(groupByArgument.where?.transaction_date).toEqual({
      gte: new Date('2026-08-15T00:00:00.000Z'),
      lt: new Date('2026-08-16T00:00:00.000Z'),
    });
    expect(prisma.transactions.groupBy).toHaveBeenCalledTimes(1);
  });

  it('uses a selected seven-day range for the weekly overview', async () => {
    prisma.spending_budgets.findMany.mockResolvedValue([
      createBudget({ period: spending_budget_period.weekly }),
    ]);
    prisma.transactions.groupBy.mockResolvedValue([]);

    await expect(
      service.getOverview('user-1', {
        period: spending_budget_period.weekly,
        start: '2026-08-10',
        end: '2026-08-16',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        period_start: '2026-08-10',
        period_end: '2026-08-16',
      }),
    );
  });

  it('rejects incomplete or non-seven-day weekly ranges before querying budgets', async () => {
    await expect(
      service.getOverview('user-1', {
        period: spending_budget_period.weekly,
        start: '2026-08-10',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getOverview('user-1', {
        period: spending_budget_period.weekly,
        start: '2026-08-10',
        end: '2026-08-15',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.spending_budgets.findMany).not.toHaveBeenCalled();
  });

  it('uses full selected calendar months and years for their overviews', async () => {
    prisma.spending_budgets.findMany.mockResolvedValue([]);

    await expect(
      service.getOverview('user-1', {
        period: spending_budget_period.monthly,
        month: '2024-02',
      }),
    ).resolves.toEqual({
      period: 'monthly',
      period_start: '2024-02-01',
      period_end: '2024-02-29',
      budgets: [],
    });
    await expect(
      service.getOverview('user-1', {
        period: spending_budget_period.yearly,
        year: '2030',
      }),
    ).resolves.toEqual({
      period: 'yearly',
      period_start: '2030-01-01',
      period_end: '2030-12-31',
      budgets: [],
    });
  });

  it('rejects unsupported filters and invalid calendar values', async () => {
    await expect(
      service.getOverview('user-1', {
        period: spending_budget_period.daily,
        month: '2026-07',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getOverview('user-1', {
        period: spending_budget_period.daily,
        date: '2026-02-30',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.spending_budgets.findMany).not.toHaveBeenCalled();
  });
});
