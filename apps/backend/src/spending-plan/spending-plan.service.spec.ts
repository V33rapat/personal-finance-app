import { BadRequestException } from '@nestjs/common';
import { Prisma, spending_plan_view, wallet_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SpendingPlanService } from './spending-plan.service';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

interface GroupByArgs {
  by: string[];
  where: {
    wallet_id: { in: string[] };
    category_id: { in: string[] };
    transfers_transfers_from_transaction_idTotransactions: { is: null };
    transfers_transfers_to_transaction_idTotransactions: { is: null };
  };
}

function createPlan() {
  return {
    id: 'plan-1',
    user_id: 'user-1',
    name: 'July essentials',
    amount: new Prisma.Decimal(180),
    start_date: date('2026-07-20'),
    end_date: date('2026-07-20'),
    cancelled_at: null,
    created_at: date('2026-07-01'),
    updated_at: date('2026-07-01'),
    spending_plan_view_preferences: {
      plan_id: 'plan-1',
      last_view: spending_plan_view.monthly,
      show_daily_balance: true,
      visible_purpose_names: ['Food'],
      created_at: date('2026-07-01'),
      updated_at: date('2026-07-01'),
    },
    spending_plan_revisions: [
      {
        id: 'revision-1',
        plan_id: 'plan-1',
        effective_date: date('2026-07-20'),
        created_at: date('2026-07-01'),
        spending_plan_revision_wallets: [
          {
            revision_id: 'revision-1',
            wallet_id: 'wallet-1',
            created_at: date('2026-07-01'),
            wallets: {
              id: 'wallet-1',
              name: 'Everyday',
              is_active: true,
              deleted_at: null,
              wallet_type: wallet_type.normal,
              wallets: null,
              other_wallets: [],
            },
          },
        ],
        spending_plan_revision_purposes: [
          {
            id: 'purpose-1',
            revision_id: 'revision-1',
            name: 'Food',
            sort_order: 0,
            created_at: date('2026-07-01'),
            spending_plan_revision_purpose_categories: [
              {
                purpose_id: 'purpose-1',
                category_id: 'category-food',
                created_at: date('2026-07-01'),
                categories: {
                  id: 'category-food',
                  name: 'Food',
                  color: '#16a34a',
                },
              },
            ],
            spending_plan_revision_allocations: [
              {
                purpose_id: 'purpose-1',
                allocation_date: date('2026-07-20'),
                amount: new Prisma.Decimal(180),
                created_at: date('2026-07-01'),
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('SpendingPlanService', () => {
  let service: SpendingPlanService;
  let prisma: {
    spending_plans: { findFirst: jest.Mock; findMany: jest.Mock };
    transactions: { groupBy: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      spending_plans: { findFirst: jest.fn(), findMany: jest.fn() },
      transactions: { groupBy: jest.fn() },
    };
    service = new SpendingPlanService(prisma as unknown as PrismaService);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-20T05:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects plans that begin before today in Bangkok', async () => {
    await expect(
      service.create('user-1', {
        name: 'Past plan',
        amount: 100,
        start_date: '2026-07-19',
        end_date: '2026-07-19',
        wallet_ids: ['550e8400-e29b-41d4-a716-446655440000'],
        purposes: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports actual spending only from the selected wallet and excludes transfers', async () => {
    prisma.spending_plans.findFirst.mockResolvedValue(createPlan());
    prisma.transactions.groupBy.mockResolvedValue([
      {
        transaction_date: date('2026-07-20'),
        wallet_id: 'wallet-1',
        category_id: 'category-food',
        _sum: { amount: new Prisma.Decimal(50) },
      },
    ]);

    const plan = await service.findOne('user-1', 'plan-1', {
      month: '2026-07',
    });

    expect(plan.view.days).toEqual([
      expect.objectContaining({
        date: '2026-07-20',
        planned: '180.00',
        actual: '50.00',
        remaining: '130.00',
      }),
    ]);
    const [[groupByArgs]] = prisma.transactions.groupBy.mock.calls as [
      [GroupByArgs],
    ];

    expect(groupByArgs.by).toEqual([
      'transaction_date',
      'category_id',
      'wallet_id',
    ]);
    expect(groupByArgs.where).toMatchObject({
      wallet_id: { in: ['wallet-1'] },
      category_id: { in: ['category-food'] },
      transfers_transfers_from_transaction_idTotransactions: { is: null },
      transfers_transfers_to_transaction_idTotransactions: { is: null },
    });
  });
});
