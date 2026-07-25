import { BadRequestException } from '@nestjs/common';
import { Prisma, spending_budget_period } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SpendingBudgetService } from './spending-budget.service';

function createBudget(
  overrides: Partial<{
    id: string;
    amount: Prisma.Decimal;
    period: spending_budget_period;
    includes_uncategorized: boolean;
    spending_budget_categories: Array<{
      category_id: string;
      categories: { id: string; name: string; color: string | null };
    }>;
  }> = {},
) {
  return {
    id: 'budget-1',
    user_id: 'user-1',
    name: 'ค่าใช้จ่ายจำเป็น',
    amount: new Prisma.Decimal(180),
    period: spending_budget_period.daily,
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
    ...overrides,
  };
}

describe('SpendingBudgetService', () => {
  let service: SpendingBudgetService;
  let prisma: {
    $transaction: jest.Mock;
    categories: { findMany: jest.Mock };
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
      by: ['category_id'],
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
        _sum: { amount: new Prisma.Decimal(100) },
      },
      {
        category_id: null,
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

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          user_id: 'user-1',
          is_active: true,
          includes_uncategorized: false,
          spending_budget_categories: { none: {} },
        },
        data: expect.objectContaining({ is_active: false }),
      }),
    );
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

    expect(prisma.transactions.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transaction_date: {
            gte: new Date('2026-08-15T00:00:00.000Z'),
            lt: new Date('2026-08-16T00:00:00.000Z'),
          },
        }),
      }),
    );
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
