import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, spending_plan_view, wallet_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CopySpendingPlanDto } from './dto/copy-spending-plan.dto';
import { CreateSpendingPlanDto } from './dto/create-spending-plan.dto';
import { FindSpendingPlanDetailDto } from './dto/find-spending-plan-detail.dto';
import { SpendingPlanPurposeDto } from './dto/spending-plan-purpose.dto';
import { UpdateSpendingPlanDto } from './dto/update-spending-plan.dto';
import { UpdateSpendingPlanPreferencesDto } from './dto/update-spending-plan-preferences.dto';

const BANGKOK_TIME_ZONE = 'Asia/Bangkok';
const DAY_MS = 86_400_000;
const planInclude = {
  spending_plan_revisions: {
    orderBy: [{ effective_date: 'asc' }, { created_at: 'asc' }],
    include: {
      spending_plan_revision_wallets: {
        include: {
          wallets: {
            select: {
              id: true,
              name: true,
              is_active: true,
              deleted_at: true,
              wallet_type: true,
              wallets: { select: { name: true } },
              other_wallets: {
                where: { is_active: true, deleted_at: null },
                select: { id: true },
              },
            },
          },
        },
      },
      spending_plan_revision_purposes: {
        orderBy: { sort_order: 'asc' },
        include: {
          spending_plan_revision_purpose_categories: {
            include: {
              categories: { select: { id: true, name: true, color: true } },
            },
          },
          spending_plan_revision_allocations: {
            orderBy: { allocation_date: 'asc' },
          },
        },
      },
    },
  },
  spending_plan_view_preferences: true,
} satisfies Prisma.spending_plansInclude;

type SpendingPlanRecord = Prisma.spending_plansGetPayload<{
  include: typeof planInclude;
}>;
type RevisionRecord = SpendingPlanRecord['spending_plan_revisions'][number];

interface NormalizedPurpose {
  name: string;
  categoryIds: string[];
  allocations: Array<{ date: string; amount: number }>;
}

interface RevisionValues {
  walletIds: string[];
  purposes: NormalizedPurpose[];
}

export interface DailyPurposeOverview {
  name: string;
  planned: string;
  actual: string;
  remaining: string;
  status: 'ok' | 'warning' | 'over' | 'planned';
}

interface TransactionSpendTotal {
  transaction_date: Date;
  wallet_id: string;
  category_id: string | null;
  _sum: { amount: Prisma.Decimal | null };
}

@Injectable()
export class SpendingPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const plans = await this.prisma.spending_plans.findMany({
      where: { user_id: userId },
      include: planInclude,
      orderBy: [{ start_date: 'desc' }, { created_at: 'desc' }],
    });

    return plans.map((plan) => this.toPlanSummary(plan));
  }

  async findOne(userId: string, id: string, query: FindSpendingPlanDetailDto) {
    const plan = await this.findOwnedPlan(userId, id);
    const month = this.resolveMonth(plan, query.month);
    const days = this.getDateRange(month.start, month.end).filter(
      (date) =>
        date >= this.toUtcDate(plan.start_date) &&
        date <= this.toUtcDate(plan.end_date),
    );
    const [daily, rangeDays] = await Promise.all([
      this.getDailyOverview(plan, days),
      this.getDailyOverview(
        plan,
        this.getDateRange(
          this.toUtcDate(plan.start_date),
          this.toUtcDate(plan.end_date),
        ),
      ),
    ]);

    return {
      ...this.toPlanSummary(plan),
      view: {
        month: query.month ?? this.toMonthString(month.start),
        calendar_start: this.toDateString(month.start),
        calendar_end: this.toDateString(month.end),
        days: daily,
        range_days: rangeDays,
      },
      revisions: plan.spending_plan_revisions
        .slice()
        .reverse()
        .map((revision) => this.toRevisionResponse(revision)),
      preferences: this.toPreferencesResponse(plan),
    };
  }

  async findRevision(userId: string, planId: string, revisionId: string) {
    const plan = await this.findOwnedPlan(userId, planId);
    const revision = plan.spending_plan_revisions.find(
      (item) => item.id === revisionId,
    );

    if (!revision) {
      throw new NotFoundException('Spending plan revision not found');
    }

    return this.toRevisionResponse(revision);
  }

  async create(userId: string, dto: CreateSpendingPlanDto) {
    const values = await this.validateCreateValues(userId, dto);
    await this.assertNoOverlap(userId, values.start, values.end, values);

    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.spending_plans.create({
        data: {
          user_id: userId,
          name: values.name,
          amount: values.amount,
          start_date: values.start,
          end_date: values.end,
          spending_plan_view_preferences: {
            create: {
              last_view: spending_plan_view.monthly,
              show_daily_balance: true,
              visible_purpose_names: values.purposes
                .slice(0, 5)
                .map((purpose) => purpose.name),
            },
          },
        },
      });

      await this.createRevision(tx, created.id, values.start, values);

      return tx.spending_plans.findUniqueOrThrow({
        where: { id: created.id },
        include: planInclude,
      });
    });

    return this.toPlanSummary(plan);
  }

  async update(userId: string, id: string, dto: UpdateSpendingPlanDto) {
    const plan = await this.findOwnedPlan(userId, id);
    this.assertMutable(plan);
    const effectiveDate = this.parseDate(dto.effective_date);
    const today = this.getTodayBangkok();
    const minimumEffectiveDate =
      this.toUtcDate(plan.start_date) > today
        ? this.toUtcDate(plan.start_date)
        : today;

    if (
      effectiveDate < minimumEffectiveDate ||
      effectiveDate > this.toUtcDate(plan.end_date)
    ) {
      throw new BadRequestException(
        'Revision effective date must be within the editable plan period',
      );
    }

    const values = await this.validateRevisionValues(userId, plan, dto);
    await this.assertNoOverlap(userId, effectiveDate, values.end, values, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.spending_plans.update({
        where: { id },
        data: {
          name: values.name,
          amount: values.amount,
          updated_at: new Date(),
        },
      });
      await this.createRevision(tx, id, effectiveDate, values);

      return tx.spending_plans.findUniqueOrThrow({
        where: { id },
        include: planInclude,
      });
    });

    return this.toPlanSummary(updated);
  }

  async cancel(userId: string, id: string) {
    const plan = await this.findOwnedPlan(userId, id);
    this.assertMutable(plan);

    const cancelled = await this.prisma.spending_plans.update({
      where: { id },
      data: { cancelled_at: new Date(), updated_at: new Date() },
      include: planInclude,
    });

    return this.toPlanSummary(cancelled);
  }

  async copy(userId: string, sourceId: string, dto: CopySpendingPlanDto) {
    const source = await this.findOwnedPlan(userId, sourceId);
    const sourceRevision = this.getRevisionForDate(
      source.spending_plan_revisions,
      this.toUtcDate(source.end_date),
    );
    const start = this.parseDate(dto.start_date);
    const end = this.parseDate(dto.end_date);
    const sourceDayCount = this.getDayCount(
      this.toUtcDate(source.start_date),
      this.toUtcDate(source.end_date),
    );

    if (this.getDayCount(start, end) !== sourceDayCount) {
      throw new BadRequestException(
        'Copied spending plans must keep the original number of days',
      );
    }

    const values: CreateSpendingPlanDto = {
      name: dto.name ?? `${source.name} (สำเนา)`,
      amount: Number(source.amount),
      start_date: dto.start_date,
      end_date: dto.end_date,
      wallet_ids: sourceRevision.spending_plan_revision_wallets.map(
        (wallet) => wallet.wallet_id,
      ),
      purposes: sourceRevision.spending_plan_revision_purposes.map(
        (purpose) => ({
          name: purpose.name,
          category_ids: purpose.spending_plan_revision_purpose_categories.map(
            (category) => category.category_id,
          ),
          allocations: purpose.spending_plan_revision_allocations.map(
            (allocation) => ({
              date: this.toDateString(
                this.shiftDate(
                  this.toUtcDate(allocation.allocation_date),
                  Math.floor(
                    (start.getTime() -
                      this.toUtcDate(source.start_date).getTime()) /
                      DAY_MS,
                  ),
                ),
              ),
              amount: Number(allocation.amount),
            }),
          ),
        }),
      ),
    };

    return this.create(userId, values);
  }

  async updatePreferences(
    userId: string,
    id: string,
    dto: UpdateSpendingPlanPreferencesDto,
  ) {
    const plan = await this.findOwnedPlan(userId, id);
    const currentRevision = this.getRevisionForDate(
      plan.spending_plan_revisions,
      this.getTodayBangkok(),
    );
    const validPurposeNames = new Set(
      currentRevision.spending_plan_revision_purposes.map(
        (purpose) => purpose.name,
      ),
    );
    const visiblePurposeNames = dto.visible_purpose_names?.map((name) =>
      name.trim(),
    );

    if (visiblePurposeNames?.some((name) => !validPurposeNames.has(name))) {
      throw new BadRequestException(
        'Visible purposes must belong to the current spending plan revision',
      );
    }

    const preferences = await this.prisma.spending_plan_view_preferences.upsert(
      {
        where: { plan_id: id },
        create: {
          plan_id: id,
          last_view: dto.last_view ?? spending_plan_view.monthly,
          show_daily_balance: dto.show_daily_balance ?? true,
          visible_purpose_names: visiblePurposeNames ?? [],
        },
        update: {
          ...(dto.last_view === undefined ? {} : { last_view: dto.last_view }),
          ...(dto.show_daily_balance === undefined
            ? {}
            : { show_daily_balance: dto.show_daily_balance }),
          ...(visiblePurposeNames === undefined
            ? {}
            : { visible_purpose_names: visiblePurposeNames }),
          updated_at: new Date(),
        },
      },
    );

    return {
      last_view: preferences.last_view,
      show_daily_balance: preferences.show_daily_balance,
      visible_purpose_names: preferences.visible_purpose_names,
    };
  }

  async getDashboardSummary(userId: string) {
    const plans = await this.prisma.spending_plans.findMany({
      where: { user_id: userId, cancelled_at: null },
      include: planInclude,
      orderBy: [{ end_date: 'asc' }, { created_at: 'asc' }],
    });
    const today = this.getTodayBangkok();
    const activePlans = plans.filter(
      (plan) => this.getPlanStatus(plan, today) === 'active',
    );

    return Promise.all(
      activePlans.map(async (plan) => {
        const [daily] = await this.getDailyOverview(plan, [today]);
        return {
          id: plan.id,
          name: plan.name,
          end_date: this.toDateString(this.toUtcDate(plan.end_date)),
          days_remaining: this.getDayCount(
            today,
            this.toUtcDate(plan.end_date),
          ),
          today: daily ?? null,
        };
      }),
    );
  }

  private async validateCreateValues(
    userId: string,
    dto: CreateSpendingPlanDto,
  ) {
    const start = this.parseDate(dto.start_date);
    const end = this.parseDate(dto.end_date);
    const today = this.getTodayBangkok();

    if (start < today) {
      throw new BadRequestException('Spending plan cannot start in the past');
    }

    return this.validateValues(userId, {
      name: dto.name,
      amount: dto.amount,
      start,
      end,
      walletIds: dto.wallet_ids,
      purposes: dto.purposes,
    });
  }

  private async validateRevisionValues(
    userId: string,
    plan: SpendingPlanRecord,
    dto: UpdateSpendingPlanDto,
  ) {
    return this.validateValues(userId, {
      name: dto.name ?? plan.name,
      amount: dto.amount ?? Number(plan.amount),
      start: this.toUtcDate(plan.start_date),
      end: this.toUtcDate(plan.end_date),
      walletIds: dto.wallet_ids,
      purposes: dto.purposes,
    });
  }

  private async validateValues(
    userId: string,
    values: {
      name: string;
      amount: number;
      start: Date;
      end: Date;
      walletIds: string[];
      purposes: SpendingPlanPurposeDto[];
    },
  ) {
    const name = values.name.trim();
    if (name.length < 3 || name.length > 100) {
      throw new BadRequestException(
        'Spending plan name must be between 3 and 100 characters',
      );
    }

    if (
      values.end < values.start ||
      this.getDayCount(values.start, values.end) > 31
    ) {
      throw new BadRequestException(
        'Spending plan must cover between one and 31 days',
      );
    }

    if (
      !Number.isFinite(values.amount) ||
      values.amount <= 0 ||
      !Number.isInteger(values.amount * 100)
    ) {
      throw new BadRequestException(
        'Spending plan amount must have no more than two decimal places',
      );
    }

    const walletIds = this.normalizeIds(values.walletIds, 'Wallets');
    await this.validateWallets(userId, walletIds);
    const purposes = this.normalizePurposes(
      values.purposes,
      values.start,
      values.end,
    );
    await this.validatePurposeCategories(userId, purposes);
    this.assertAllocationTotal(values.amount, purposes);

    return {
      name,
      amount: values.amount,
      start: values.start,
      end: values.end,
      walletIds,
      purposes,
    };
  }

  private normalizePurposes(
    purposes: SpendingPlanPurposeDto[],
    start: Date,
    end: Date,
  ) {
    if (purposes.length < 1 || purposes.length > 10) {
      throw new BadRequestException(
        'Spending plan supports one to 10 purposes',
      );
    }

    const expectedDates = this.getDateRange(start, end).map((date) =>
      this.toDateString(date),
    );
    const purposeNames = new Set<string>();

    return purposes.map((purpose) => {
      const name = purpose.name.trim();
      if (!name || purposeNames.has(name)) {
        throw new BadRequestException('Purpose names must be unique');
      }
      purposeNames.add(name);

      const categoryIds = this.normalizeIds(purpose.category_ids, 'Categories');
      const allocationByDate = new Map(
        purpose.allocations.map((allocation) => [allocation.date, allocation]),
      );

      if (
        allocationByDate.size !== purpose.allocations.length ||
        expectedDates.some((date) => !allocationByDate.has(date)) ||
        [...allocationByDate.keys()].some(
          (date) => !expectedDates.includes(date),
        )
      ) {
        throw new BadRequestException(
          'Every purpose must contain one allocation for each plan day',
        );
      }

      const allocations = expectedDates.map((date) => {
        const allocation = allocationByDate.get(date);
        if (!allocation) {
          throw new BadRequestException('Spending plan allocation is missing');
        }
        if (
          !Number.isFinite(allocation.amount) ||
          allocation.amount < 0 ||
          !Number.isInteger(allocation.amount * 100)
        ) {
          throw new BadRequestException(
            'Spending plan allocations must have no more than two decimal places',
          );
        }
        return { date, amount: allocation.amount };
      });

      return { name, categoryIds, allocations };
    });
  }

  private async validateWallets(userId: string, walletIds: string[]) {
    const wallets = await this.prisma.wallets.findMany({
      where: {
        id: { in: walletIds },
        user_id: userId,
        wallet_type: wallet_type.normal,
        is_active: true,
        deleted_at: null,
        other_wallets: { none: { is_active: true, deleted_at: null } },
      },
      select: { id: true },
    });

    if (wallets.length !== walletIds.length) {
      throw new BadRequestException(
        'Wallets must be available normal transaction wallets',
      );
    }
  }

  private async validatePurposeCategories(
    userId: string,
    purposes: Array<{ name: string; categoryIds: string[] }>,
  ) {
    const categoryIds = purposes.flatMap((purpose) => purpose.categoryIds);
    if (new Set(categoryIds).size !== categoryIds.length) {
      throw new BadRequestException(
        'A category can belong to only one spending plan purpose',
      );
    }

    const categories = await this.prisma.categories.findMany({
      where: {
        id: { in: categoryIds },
        type: 'expense',
        OR: [{ user_id: userId }, { user_id: null, is_system: true }],
      },
      select: { id: true },
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException(
        'Purpose categories must be available expense categories',
      );
    }
  }

  private assertAllocationTotal(
    amount: number,
    purposes: Array<{ allocations: Array<{ amount: number }> }>,
  ) {
    const allocationTotal = purposes.reduce(
      (total, purpose) =>
        total +
        purpose.allocations.reduce(
          (purposeTotal, allocation) => purposeTotal + allocation.amount,
          0,
        ),
      0,
    );

    if (Math.round(allocationTotal * 100) !== Math.round(amount * 100)) {
      throw new BadRequestException(
        'Spending plan allocations must equal the plan amount',
      );
    }
  }

  private async assertNoOverlap(
    userId: string,
    start: Date,
    end: Date,
    values: RevisionValues & { start: Date; end: Date },
    excludePlanId?: string,
  ) {
    const plans = await this.prisma.spending_plans.findMany({
      where: {
        user_id: userId,
        cancelled_at: null,
        start_date: { lte: end },
        end_date: { gte: start },
        ...(excludePlanId ? { id: { not: excludePlanId } } : {}),
      },
      include: planInclude,
    });
    const requestedCategories = new Set(
      values.purposes.flatMap((purpose) => purpose.categoryIds),
    );

    const overlaps = plans.some((plan) => {
      const overlapStart =
        this.toUtcDate(plan.start_date) > start
          ? this.toUtcDate(plan.start_date)
          : start;
      const overlapEnd =
        this.toUtcDate(plan.end_date) < end
          ? this.toUtcDate(plan.end_date)
          : end;

      return this.getDateRange(overlapStart, overlapEnd).some((date) => {
        const revision = this.getRevisionForDate(
          plan.spending_plan_revisions,
          date,
        );
        const existingWalletIds = new Set(
          revision.spending_plan_revision_wallets.map(
            (wallet) => wallet.wallet_id,
          ),
        );
        const hasWalletOverlap = values.walletIds.some((walletId) =>
          existingWalletIds.has(walletId),
        );
        const hasCategoryOverlap =
          revision.spending_plan_revision_purposes.some((purpose) =>
            purpose.spending_plan_revision_purpose_categories.some((category) =>
              requestedCategories.has(category.category_id),
            ),
          );

        return hasWalletOverlap && hasCategoryOverlap;
      });
    });

    if (overlaps) {
      throw new BadRequestException(
        'Another active spending plan already uses the same wallet and category scope',
      );
    }
  }

  private async createRevision(
    tx: Prisma.TransactionClient,
    planId: string,
    effectiveDate: Date,
    values: RevisionValues,
  ) {
    await tx.spending_plan_revisions.create({
      data: {
        plan_id: planId,
        effective_date: effectiveDate,
        spending_plan_revision_wallets: {
          create: values.walletIds.map((walletId) => ({ wallet_id: walletId })),
        },
        spending_plan_revision_purposes: {
          create: values.purposes.map((purpose, index) => ({
            name: purpose.name,
            sort_order: index,
            spending_plan_revision_purpose_categories: {
              create: purpose.categoryIds.map((categoryId) => ({
                category_id: categoryId,
              })),
            },
            spending_plan_revision_allocations: {
              create: purpose.allocations.map((allocation) => ({
                allocation_date: this.parseDate(allocation.date),
                amount: allocation.amount,
              })),
            },
          })),
        },
      },
    });
  }

  private async getDailyOverview(plan: SpendingPlanRecord, days: Date[]) {
    if (days.length === 0) {
      return [];
    }

    const periodStart = days[0];
    const periodEndExclusive = this.addDays(days[days.length - 1], 1);
    const walletIds = new Set<string>();
    const categoryIds = new Set<string>();
    days.forEach((date) => {
      const revision = this.getRevisionForDate(
        plan.spending_plan_revisions,
        date,
      );
      revision.spending_plan_revision_wallets.forEach((wallet) =>
        walletIds.add(wallet.wallet_id),
      );
      revision.spending_plan_revision_purposes.forEach((purpose) =>
        purpose.spending_plan_revision_purpose_categories.forEach((category) =>
          categoryIds.add(category.category_id),
        ),
      );
    });

    const totals: TransactionSpendTotal[] =
      walletIds.size === 0 || categoryIds.size === 0
        ? []
        : ((await this.prisma.transactions.groupBy({
            by: ['transaction_date', 'category_id', 'wallet_id'],
            where: {
              wallet_id: { in: [...walletIds] },
              category_id: { in: [...categoryIds] },
              type: 'expense',
              deleted_at: null,
              transaction_date: { gte: periodStart, lt: periodEndExclusive },
              transfers_transfers_from_transaction_idTotransactions: {
                is: null,
              },
              transfers_transfers_to_transaction_idTotransactions: { is: null },
            },
            _sum: { amount: true },
          })) as unknown as TransactionSpendTotal[]);

    const amountsByDate = new Map<string, Map<string, Prisma.Decimal>>();
    totals.forEach((total) => {
      if (!total.category_id) {
        return;
      }
      const dateKey = this.toDateString(this.toUtcDate(total.transaction_date));
      const amounts =
        amountsByDate.get(dateKey) ?? new Map<string, Prisma.Decimal>();
      amounts.set(
        `${total.wallet_id}:${total.category_id}`,
        new Prisma.Decimal(total._sum.amount ?? 0),
      );
      amountsByDate.set(dateKey, amounts);
    });

    return days.map((date) => {
      const revision = this.getRevisionForDate(
        plan.spending_plan_revisions,
        date,
      );
      const dateKey = this.toDateString(date);
      const amounts =
        amountsByDate.get(dateKey) ?? new Map<string, Prisma.Decimal>();
      const revisionWalletIds = revision.spending_plan_revision_wallets.map(
        (wallet) => wallet.wallet_id,
      );
      const today = this.getTodayBangkok();
      const purposes: DailyPurposeOverview[] =
        revision.spending_plan_revision_purposes.map((purpose) => {
          const allocation = purpose.spending_plan_revision_allocations.find(
            (item) =>
              this.toDateString(this.toUtcDate(item.allocation_date)) ===
              dateKey,
          );
          const planned = new Prisma.Decimal(allocation?.amount ?? 0);
          const actual =
            purpose.spending_plan_revision_purpose_categories.reduce(
              (sum, category) =>
                revisionWalletIds.reduce(
                  (walletSum, walletId) =>
                    walletSum.plus(
                      amounts.get(`${walletId}:${category.category_id}`) ?? 0,
                    ),
                  sum,
                ),
              new Prisma.Decimal(0),
            );
          const remaining = planned.minus(actual);

          return {
            name: purpose.name,
            planned: planned.toFixed(2),
            actual: actual.toFixed(2),
            remaining: remaining.toFixed(2),
            status: this.getAmountStatus(actual, planned, date > today),
          };
        });
      const planned = purposes.reduce(
        (sum, purpose) => sum.plus(purpose.planned),
        new Prisma.Decimal(0),
      );
      const actual = purposes.reduce(
        (sum, purpose) => sum.plus(purpose.actual),
        new Prisma.Decimal(0),
      );
      const remaining = planned.minus(actual);

      return {
        date: dateKey,
        planned: planned.toFixed(2),
        actual: actual.toFixed(2),
        remaining: remaining.toFixed(2),
        status: this.getAmountStatus(actual, planned, date > today),
        purposes,
      };
    });
  }

  private getAmountStatus(
    actual: Prisma.Decimal,
    planned: Prisma.Decimal,
    isFuture: boolean,
  ): DailyPurposeOverview['status'] {
    if (isFuture && actual.isZero()) {
      return 'planned';
    }
    if (actual.greaterThan(planned)) {
      return 'over';
    }
    if (
      !planned.isZero() &&
      actual.dividedBy(planned).greaterThanOrEqualTo(0.8)
    ) {
      return 'warning';
    }
    return 'ok';
  }

  private toPlanSummary(plan: SpendingPlanRecord) {
    const today = this.getTodayBangkok();
    const currentRevision = this.getRevisionForDate(
      plan.spending_plan_revisions,
      today,
    );
    const wallets = currentRevision.spending_plan_revision_wallets.map(
      (record) => ({
        id: record.wallets.id,
        name: record.wallets.name,
        parent_name: record.wallets.wallets?.name ?? null,
        is_available: this.isWalletAvailable(record.wallets),
      }),
    );

    return {
      id: plan.id,
      name: plan.name,
      amount: plan.amount.toFixed(2),
      start_date: this.toDateString(this.toUtcDate(plan.start_date)),
      end_date: this.toDateString(this.toUtcDate(plan.end_date)),
      status: this.getPlanStatus(plan, today),
      cancelled_at: plan.cancelled_at,
      wallets,
      unavailable_wallet_count: wallets.filter((wallet) => !wallet.is_available)
        .length,
      purpose_count: currentRevision.spending_plan_revision_purposes.length,
      current_revision_id: currentRevision.id,
    };
  }

  private toRevisionResponse(revision: RevisionRecord) {
    return {
      id: revision.id,
      effective_date: this.toDateString(
        this.toUtcDate(revision.effective_date),
      ),
      created_at: revision.created_at,
      wallet_ids: revision.spending_plan_revision_wallets.map(
        (wallet) => wallet.wallet_id,
      ),
      purposes: revision.spending_plan_revision_purposes.map((purpose) => ({
        name: purpose.name,
        category_ids: purpose.spending_plan_revision_purpose_categories.map(
          (category) => category.category_id,
        ),
        categories: purpose.spending_plan_revision_purpose_categories.map(
          (category) => ({
            id: category.categories.id,
            name: category.categories.name,
            color: category.categories.color,
          }),
        ),
        allocations: purpose.spending_plan_revision_allocations.map(
          (allocation) => ({
            date: this.toDateString(this.toUtcDate(allocation.allocation_date)),
            amount: allocation.amount.toFixed(2),
          }),
        ),
      })),
    };
  }

  private toPreferencesResponse(plan: SpendingPlanRecord) {
    const preferences = plan.spending_plan_view_preferences;
    return {
      last_view: preferences?.last_view ?? spending_plan_view.monthly,
      show_daily_balance: preferences?.show_daily_balance ?? true,
      visible_purpose_names: preferences?.visible_purpose_names ?? [],
    };
  }

  private async findOwnedPlan(userId: string, id: string) {
    const plan = await this.prisma.spending_plans.findFirst({
      where: { id, user_id: userId },
      include: planInclude,
    });

    if (!plan) {
      throw new NotFoundException('Spending plan not found');
    }
    if (plan.spending_plan_revisions.length === 0) {
      throw new BadRequestException('Spending plan has no revision');
    }

    return plan;
  }

  private getRevisionForDate(revisions: RevisionRecord[], date: Date) {
    const matched = revisions
      .filter((revision) => this.toUtcDate(revision.effective_date) <= date)
      .at(-1);
    return matched ?? revisions[0];
  }

  private getPlanStatus(plan: SpendingPlanRecord, today: Date) {
    if (plan.cancelled_at) {
      return 'cancelled';
    }
    if (today < this.toUtcDate(plan.start_date)) {
      return 'scheduled';
    }
    if (today > this.toUtcDate(plan.end_date)) {
      return 'completed';
    }
    return 'active';
  }

  private assertMutable(plan: SpendingPlanRecord) {
    const status = this.getPlanStatus(plan, this.getTodayBangkok());
    if (status === 'completed' || status === 'cancelled') {
      throw new BadRequestException(
        'Completed or cancelled plans cannot be changed',
      );
    }
  }

  private isWalletAvailable(
    wallet: RevisionRecord['spending_plan_revision_wallets'][number]['wallets'],
  ) {
    return (
      wallet.wallet_type === wallet_type.normal &&
      wallet.is_active &&
      wallet.deleted_at === null &&
      wallet.other_wallets.length === 0
    );
  }

  private normalizeIds(ids: string[], label: string) {
    const normalized = [...new Set(ids)];
    if (normalized.length !== ids.length || normalized.length === 0) {
      throw new BadRequestException(
        `${label} must be selected without duplicates`,
      );
    }
    return normalized;
  }

  private resolveMonth(plan: SpendingPlanRecord, month?: string) {
    const date = month
      ? this.parseDate(`${month}-01`)
      : this.toUtcDate(plan.start_date);
    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
    );
    const end = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    );
    const planStart = this.toUtcDate(plan.start_date);
    const planEnd = this.toUtcDate(plan.end_date);

    if (end < planStart || start > planEnd) {
      throw new BadRequestException(
        'Month must overlap the spending plan period',
      );
    }
    return { start, end };
  }

  private getTodayBangkok() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: BANGKOK_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );
    return new Date(
      Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
      ),
    );
  }

  private parseDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || this.toDateString(date) !== value) {
      throw new BadRequestException('Date is invalid');
    }
    return date;
  }

  private toUtcDate(value: Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  private toDateString(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private toMonthString(date: Date) {
    return this.toDateString(date).slice(0, 7);
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private shiftDate(date: Date, days: number) {
    return this.addDays(date, days);
  }

  private getDateRange(start: Date, end: Date) {
    const dates: Date[] = [];
    for (
      let date = new Date(start);
      date <= end;
      date = this.addDays(date, 1)
    ) {
      dates.push(date);
    }
    return dates;
  }

  private getDayCount(start: Date, end: Date) {
    return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  }
}
