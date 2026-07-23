import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    $transaction: jest.Mock;
    transactions: { groupBy: jest.Mock; aggregate: jest.Mock };
    wallets: { count: jest.Mock };
    categories: { findMany: jest.Mock };
    dashboard_preferences: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      upsert: jest.Mock;
    };
    dashboard_hidden_categories: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      transactions: {
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      wallets: { count: jest.fn() },
      categories: { findMany: jest.fn() },
      dashboard_preferences: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        upsert: jest.fn(),
      },
      dashboard_hidden_categories: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  it('returns a user-scoped summary for the selected reporting month', async () => {
    prisma.$transaction.mockResolvedValue([
      [
        { type: 'income', _sum: { amount: new Prisma.Decimal(5000) } },
        { type: 'expense', _sum: { amount: new Prisma.Decimal(1200) } },
      ],
      { _sum: { amount: new Prisma.Decimal(700) } },
      3,
    ]);

    await expect(service.getSummary('user-1', '2026-07')).resolves.toEqual({
      month: '2026-07',
      total_balance: '3800.00',
      monthly_spending: '700.00',
      active_wallet_count: 3,
    });

    const activeWalletWhere = {
      user_id: 'user-1',
      is_active: true,
      deleted_at: null,
      created_at: { lt: new Date('2026-08-01T00:00:00.000Z') },
    };

    expect(prisma.transactions.groupBy).toHaveBeenCalledWith({
      by: ['type'],
      orderBy: { type: 'asc' },
      where: {
        deleted_at: null,
        transaction_date: { lt: new Date('2026-08-01T00:00:00.000Z') },
        wallets: activeWalletWhere,
      },
      _sum: { amount: true },
    });
    expect(prisma.wallets.count).toHaveBeenCalledWith({
      where: activeWalletWhere,
    });
  });

  it('counts only real expenses in the selected month', async () => {
    prisma.$transaction.mockResolvedValue([
      [],
      { _sum: { amount: new Prisma.Decimal(450) } },
      1,
    ]);

    await service.getSummary('user-1', '2026-07');

    expect(prisma.transactions.aggregate).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
        type: 'expense',
        transaction_date: {
          gte: new Date('2026-07-01T00:00:00.000Z'),
          lt: new Date('2026-08-01T00:00:00.000Z'),
        },
        wallets: {
          user_id: 'user-1',
          is_active: true,
          deleted_at: null,
          created_at: { lt: new Date('2026-08-01T00:00:00.000Z') },
        },
        transfers_transfers_from_transaction_idTotransactions: { is: null },
        transfers_transfers_to_transaction_idTotransactions: { is: null },
      },
      _sum: { amount: true },
    });
  });

  it.each(['2026-7', '2026-13', 'not-a-month', '2099-01'])(
    'rejects an invalid or future reporting month: %s',
    async (month) => {
      await expect(service.getSummary('user-1', month)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it('returns the current Monday through today when preferences have not been saved', async () => {
    prisma.dashboard_preferences.findUnique.mockResolvedValue(null);

    const preferences = await service.getPreferences('user-1');
    const start = new Date(`${preferences.period_start}T00:00:00.000Z`);
    const end = new Date(`${preferences.period_end}T00:00:00.000Z`);

    expect(start.getUTCDay()).toBe(1);
    expect(end.getTime() - start.getTime()).toBeLessThanOrEqual(6 * 86_400_000);
    expect(preferences).toEqual({
      period_start: preferences.period_start,
      period_end: preferences.period_end,
      is_category_breakdown_enabled: false,
      hidden_category_ids: [],
    });
  });

  it('saves validated dashboard preferences and hidden categories atomically', async () => {
    const transaction = {
      dashboard_preferences: {
        upsert: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      dashboard_hidden_categories: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    const hiddenCategoryId = 'd4c5104a-b394-4ba7-9c1a-6eb8052faa44';
    const savedPreferences = {
      period_start: new Date('2026-07-20T00:00:00.000Z'),
      period_end: new Date('2026-07-23T00:00:00.000Z'),
      is_category_breakdown_enabled: true,
      dashboard_hidden_categories: [{ category_id: hiddenCategoryId }],
    };

    prisma.categories.findMany.mockResolvedValue([{ id: hiddenCategoryId }]);
    transaction.dashboard_preferences.findUniqueOrThrow.mockResolvedValue(
      savedPreferences,
    );
    prisma.$transaction.mockImplementation(
      async (
        callback: (tx: typeof transaction) => Promise<typeof savedPreferences>,
      ) => callback(transaction),
    );

    await expect(
      service.updatePreferences('user-1', {
        period_start: '2026-07-20',
        period_end: '2026-07-23',
        is_category_breakdown_enabled: true,
        hidden_category_ids: [hiddenCategoryId],
      }),
    ).resolves.toEqual({
      period_start: '2026-07-20',
      period_end: '2026-07-23',
      is_category_breakdown_enabled: true,
      hidden_category_ids: [hiddenCategoryId],
    });

    expect(prisma.categories.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [hiddenCategoryId] },
        OR: [{ user_id: 'user-1' }, { user_id: null, is_system: true }],
      },
      select: { id: true },
    });
    expect(
      transaction.dashboard_hidden_categories.deleteMany,
    ).toHaveBeenCalledWith({
      where: { user_id: 'user-1' },
    });
    expect(
      transaction.dashboard_hidden_categories.createMany,
    ).toHaveBeenCalledWith({
      data: [{ user_id: 'user-1', category_id: hiddenCategoryId }],
    });
  });

  it.each([
    ['2026-07-23', '2026-07-22'],
    ['2026-07-01', '2026-07-11'],
    ['2026-02-30', '2026-03-01'],
  ])(
    'rejects an invalid dashboard date range: %s through %s',
    async (start, end) => {
      await expect(
        service.updatePreferences('user-1', {
          period_start: start,
          period_end: end,
          is_category_breakdown_enabled: false,
          hidden_category_ids: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejects hidden categories that are not available to the current user', async () => {
    prisma.categories.findMany.mockResolvedValue([]);

    await expect(
      service.updatePreferences('user-1', {
        period_start: '2026-07-20',
        period_end: '2026-07-20',
        is_category_breakdown_enabled: false,
        hidden_category_ids: ['d4c5104a-b394-4ba7-9c1a-6eb8052faa44'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
