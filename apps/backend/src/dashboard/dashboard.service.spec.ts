import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    $transaction: jest.Mock;
    transactions: { groupBy: jest.Mock; aggregate: jest.Mock };
    wallets: { count: jest.Mock; findMany: jest.Mock };
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
    dashboard_wallet_summary_preferences: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    dashboard_wallet_summary_wallets: {
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
      wallets: { count: jest.fn(), findMany: jest.fn() },
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
      dashboard_wallet_summary_preferences: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      dashboard_wallet_summary_wallets: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createWalletSummaryWallet = (
    id: string,
    balance: string,
    options: {
      name?: string;
      wallet_type?: 'normal' | 'investment';
      created_at?: string;
      latest_transaction_at?: string | null;
      parent_name?: string | null;
    } = {},
  ) => ({
    id,
    name: options.name ?? id,
    wallet_type: options.wallet_type ?? 'normal',
    balance: new Prisma.Decimal(balance),
    color: '#7C3AED',
    icon: 'wallet',
    is_active: true,
    deleted_at: null,
    created_at: new Date(options.created_at ?? '2026-07-01T00:00:00.000Z'),
    wallets: options.parent_name ? { name: options.parent_name } : null,
    transactions: options.latest_transaction_at
      ? [{ created_at: new Date(options.latest_transaction_at) }]
      : [],
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

  it('excludes paired transfers from monthly spending without excluding them from total balance', async () => {
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

  it('uses the Bangkok calendar date across midnight for defaults and future-date validation', async () => {
    jest.useFakeTimers();
    prisma.dashboard_preferences.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockResolvedValue([[], { _sum: { amount: null } }, 0]);

    jest.setSystemTime(new Date('2026-07-31T16:59:59.000Z').getTime());

    await expect(service.getPreferences('user-a')).resolves.toEqual({
      period_start: '2026-07-27',
      period_end: '2026-07-31',
      is_category_breakdown_enabled: false,
      hidden_category_ids: [],
    });
    await expect(service.getSummary('user-a')).resolves.toMatchObject({
      month: '2026-07',
    });
    await expect(
      service.getOverview('user-a', '2026-08-01', '2026-08-01'),
    ).rejects.toBeInstanceOf(BadRequestException);

    jest.setSystemTime(new Date('2026-07-31T17:00:00.000Z').getTime());
    prisma.transactions.groupBy.mockResolvedValue([]);

    await expect(service.getPreferences('user-a')).resolves.toEqual({
      period_start: '2026-07-27',
      period_end: '2026-08-01',
      is_category_breakdown_enabled: false,
      hidden_category_ids: [],
    });
    await expect(service.getSummary('user-a')).resolves.toMatchObject({
      month: '2026-08',
    });
    await expect(
      service.getOverview('user-a', '2026-08-01', '2026-08-01'),
    ).resolves.toMatchObject({
      period_start: '2026-08-01',
      period_end: '2026-08-01',
    });
  });

  it('returns one zero-filled day for a single-day overview', async () => {
    prisma.transactions.groupBy.mockResolvedValue([]);

    await expect(
      service.getOverview('user-a', '2026-07-20', '2026-07-20'),
    ).resolves.toEqual({
      period_start: '2026-07-20',
      period_end: '2026-07-20',
      totals: { income: '0.00', expense: '0.00', net: '0.00' },
      days: [
        {
          date: '2026-07-20',
          income_total: '0.00',
          expense_total: '0.00',
          income_categories: [],
          expense_categories: [],
        },
      ],
      expense_categories: [],
    });
  });

  it('allows a 10-day overview across months and scopes it to active wallets of the current user', async () => {
    prisma.transactions.groupBy.mockResolvedValue([]);

    const overview = await service.getOverview(
      'user-a',
      '2026-01-28',
      '2026-02-06',
    );

    expect(overview.days).toHaveLength(10);
    expect(overview.days.map((day) => day.date)).toEqual([
      '2026-01-28',
      '2026-01-29',
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
      '2026-02-02',
      '2026-02-03',
      '2026-02-04',
      '2026-02-05',
      '2026-02-06',
    ]);
    expect(prisma.transactions.groupBy).toHaveBeenCalledWith({
      by: ['transaction_date', 'type', 'category_id'],
      where: {
        deleted_at: null,
        transaction_date: {
          gte: new Date('2026-01-28T00:00:00.000Z'),
          lt: new Date('2026-02-07T00:00:00.000Z'),
        },
        wallets: {
          user_id: 'user-a',
          is_active: true,
          deleted_at: null,
          created_at: { lt: new Date('2026-02-07T00:00:00.000Z') },
        },
        transfers_transfers_from_transaction_idTotransactions: { is: null },
        transfers_transfers_to_transaction_idTotransactions: { is: null },
      },
      _sum: { amount: true },
      orderBy: [{ transaction_date: 'asc' }, { type: 'asc' }],
    });
  });

  it('rejects an overview period longer than 10 days before querying Prisma', async () => {
    await expect(
      service.getOverview('user-a', '2026-01-28', '2026-02-07'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.transactions.groupBy).not.toHaveBeenCalled();
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

  it('loads hidden category preferences only for the current user', async () => {
    prisma.dashboard_preferences.findUnique.mockResolvedValue({
      period_start: new Date('2026-07-20T00:00:00.000Z'),
      period_end: new Date('2026-07-23T00:00:00.000Z'),
      is_category_breakdown_enabled: true,
      dashboard_hidden_categories: [
        { category_id: 'd4c5104a-b394-4ba7-9c1a-6eb8052faa44' },
      ],
    });

    await expect(service.getPreferences('user-a')).resolves.toEqual({
      period_start: '2026-07-20',
      period_end: '2026-07-23',
      is_category_breakdown_enabled: true,
      hidden_category_ids: ['d4c5104a-b394-4ba7-9c1a-6eb8052faa44'],
    });
    expect(prisma.dashboard_preferences.findUnique).toHaveBeenCalledWith({
      where: { user_id: 'user-a' },
      include: { dashboard_hidden_categories: true },
    });
  });

  it('returns a zero-filled, user-scoped category overview without paired transfer transactions', async () => {
    prisma.transactions.groupBy.mockResolvedValue([
      {
        transaction_date: new Date('2026-07-20T00:00:00.000Z'),
        type: 'income',
        category_id: 'a9f51261-03ee-44cf-a5fd-730af76a4178',
        _sum: { amount: new Prisma.Decimal(1200) },
      },
      {
        transaction_date: new Date('2026-07-20T00:00:00.000Z'),
        type: 'expense',
        category_id: 'a2107982-4d60-4680-9332-0f051d0150e4',
        _sum: { amount: new Prisma.Decimal(300) },
      },
      {
        transaction_date: new Date('2026-07-22T00:00:00.000Z'),
        type: 'expense',
        category_id: null,
        _sum: { amount: new Prisma.Decimal(50) },
      },
    ]);
    prisma.categories.findMany.mockResolvedValue([
      {
        id: 'a9f51261-03ee-44cf-a5fd-730af76a4178',
        name: 'Salary',
        color: '#16A34A',
      },
      {
        id: 'a2107982-4d60-4680-9332-0f051d0150e4',
        name: 'Food',
        color: '#DC2626',
      },
    ]);

    await expect(
      service.getOverview('user-1', '2026-07-20', '2026-07-22'),
    ).resolves.toEqual({
      period_start: '2026-07-20',
      period_end: '2026-07-22',
      totals: { income: '1200.00', expense: '350.00', net: '850.00' },
      days: [
        {
          date: '2026-07-20',
          income_total: '1200.00',
          expense_total: '300.00',
          income_categories: [
            {
              category_id: 'a9f51261-03ee-44cf-a5fd-730af76a4178',
              category_name: 'Salary',
              category_color: '#16A34A',
              amount: '1200.00',
            },
          ],
          expense_categories: [
            {
              category_id: 'a2107982-4d60-4680-9332-0f051d0150e4',
              category_name: 'Food',
              category_color: '#DC2626',
              amount: '300.00',
            },
          ],
        },
        {
          date: '2026-07-21',
          income_total: '0.00',
          expense_total: '0.00',
          income_categories: [],
          expense_categories: [],
        },
        {
          date: '2026-07-22',
          income_total: '0.00',
          expense_total: '50.00',
          income_categories: [],
          expense_categories: [
            {
              category_id: null,
              category_name: 'Uncategorized',
              category_color: null,
              amount: '50.00',
            },
          ],
        },
      ],
      expense_categories: [
        {
          category_id: 'a2107982-4d60-4680-9332-0f051d0150e4',
          category_name: 'Food',
          category_color: '#DC2626',
          amount: '300.00',
        },
        {
          category_id: null,
          category_name: 'Uncategorized',
          category_color: null,
          amount: '50.00',
        },
      ],
    });

    expect(prisma.transactions.groupBy).toHaveBeenCalledWith({
      by: ['transaction_date', 'type', 'category_id'],
      where: {
        deleted_at: null,
        transaction_date: {
          gte: new Date('2026-07-20T00:00:00.000Z'),
          lt: new Date('2026-07-23T00:00:00.000Z'),
        },
        wallets: {
          user_id: 'user-1',
          is_active: true,
          deleted_at: null,
          created_at: { lt: new Date('2026-07-23T00:00:00.000Z') },
        },
        transfers_transfers_from_transaction_idTotransactions: { is: null },
        transfers_transfers_to_transaction_idTotransactions: { is: null },
      },
      _sum: { amount: true },
      orderBy: [{ transaction_date: 'asc' }, { type: 'asc' }],
    });
  });

  it('rejects future overview dates', async () => {
    await expect(
      service.getOverview('user-1', '2099-01-01', '2099-01-01'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('defaults to four recently active eligible wallets and sorts cards by balance', async () => {
    prisma.dashboard_wallet_summary_preferences.findUnique.mockResolvedValue(
      null,
    );
    prisma.wallets.findMany.mockResolvedValue([
      createWalletSummaryWallet('weekly-spending', '720.00', {
        latest_transaction_at: '2026-07-20T03:00:00.000Z',
      }),
      createWalletSummaryWallet('emergency-fund', '12500.00', {
        latest_transaction_at: '2026-07-21T03:00:00.000Z',
        parent_name: 'Savings',
      }),
      createWalletSummaryWallet('investment', '4500.00', {
        wallet_type: 'investment',
        latest_transaction_at: '2026-07-19T03:00:00.000Z',
      }),
      createWalletSummaryWallet('travel', '1800.00', {
        created_at: '2026-07-18T03:00:00.000Z',
      }),
      createWalletSummaryWallet('not-shown', '99999.00', {
        latest_transaction_at: '2026-07-01T03:00:00.000Z',
      }),
    ]);

    const walletSummary = await service.getWalletSummary('user-1');

    expect(walletSummary).toMatchObject({
      is_configured: false,
      displayed_wallets: [
        expect.objectContaining({ id: 'emergency-fund', balance: '12500.00' }),
        expect.objectContaining({ id: 'investment', balance: '4500.00' }),
        expect.objectContaining({ id: 'travel', balance: '1800.00' }),
        expect.objectContaining({ id: 'weekly-spending', balance: '720.00' }),
      ],
      selected_wallets: [],
    });
    expect(walletSummary.eligible_wallets).toHaveLength(5);
    expect(prisma.wallets.findMany).toHaveBeenCalledTimes(1);
  });

  it('hides unavailable selected wallets while retaining them in settings', async () => {
    const availableWallet = createWalletSummaryWallet('available', '300.00');
    const unavailableWallet = {
      ...createWalletSummaryWallet('inactive', '400.00'),
      is_active: false,
    };
    prisma.dashboard_wallet_summary_preferences.findUnique.mockResolvedValue({
      is_configured: true,
      dashboard_wallet_summary_wallets: [
        { wallet_id: 'available', wallets: availableWallet },
        { wallet_id: 'inactive', wallets: unavailableWallet },
      ],
    });
    prisma.wallets.findMany.mockResolvedValue([availableWallet]);

    await expect(service.getWalletSummary('user-1')).resolves.toMatchObject({
      is_configured: true,
      displayed_wallets: [
        expect.objectContaining({ id: 'available', is_available: true }),
      ],
      selected_wallets: [
        expect.objectContaining({ id: 'available', is_available: true }),
        expect.objectContaining({ id: 'inactive', is_available: false }),
      ],
    });
  });

  it('rejects a newly selected wallet that is not eligible for the user', async () => {
    prisma.dashboard_wallet_summary_preferences.findUnique.mockResolvedValue({
      dashboard_wallet_summary_wallets: [],
    });
    prisma.wallets.count.mockResolvedValue(0);

    await expect(
      service.updateWalletSummary('user-1', {
        wallet_ids: ['a8a1e64b-3e93-48c5-8311-5eae6544f8d5'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.wallets.count).toHaveBeenCalledWith({
      where: {
        user_id: 'user-1',
        is_active: true,
        deleted_at: null,
        other_wallets: {
          none: { is_active: true, deleted_at: null },
        },
        id: { in: ['a8a1e64b-3e93-48c5-8311-5eae6544f8d5'] },
      },
    });
  });

  it('persists a user selection and allows zero wallets', async () => {
    const selectedWallet = createWalletSummaryWallet('wallet-1', '250.00');
    const transaction = {
      dashboard_wallet_summary_preferences: { upsert: jest.fn() },
      dashboard_wallet_summary_wallets: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    prisma.dashboard_wallet_summary_preferences.findUnique
      .mockResolvedValueOnce({ dashboard_wallet_summary_wallets: [] })
      .mockResolvedValueOnce({
        is_configured: true,
        dashboard_wallet_summary_wallets: [
          { wallet_id: 'wallet-1', wallets: selectedWallet },
        ],
      });
    prisma.wallets.count.mockResolvedValue(1);
    prisma.wallets.findMany.mockResolvedValue([selectedWallet]);
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof transaction) => Promise<void>) =>
        callback(transaction),
    );

    await expect(
      service.updateWalletSummary('user-1', { wallet_ids: ['wallet-1'] }),
    ).resolves.toMatchObject({
      is_configured: true,
      displayed_wallets: [expect.objectContaining({ id: 'wallet-1' })],
    });
    expect(
      transaction.dashboard_wallet_summary_wallets.createMany,
    ).toHaveBeenCalledWith({
      data: [{ user_id: 'user-1', wallet_id: 'wallet-1' }],
    });

    prisma.dashboard_wallet_summary_preferences.findUnique
      .mockResolvedValueOnce({
        dashboard_wallet_summary_wallets: [{ wallet_id: 'wallet-1' }],
      })
      .mockResolvedValueOnce({
        is_configured: true,
        dashboard_wallet_summary_wallets: [],
      });
    prisma.wallets.findMany.mockResolvedValue([selectedWallet]);

    await expect(
      service.updateWalletSummary('user-1', { wallet_ids: [] }),
    ).resolves.toMatchObject({
      is_configured: true,
      displayed_wallets: [],
    });
  });
});
