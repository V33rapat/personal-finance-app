import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDashboardPreferencesDto } from './dto/update-dashboard-preferences.dto';

const BANGKOK_TIME_ZONE = 'Asia/Bangkok';
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface ReportingPeriod {
  month: string;
  start: Date;
  end: Date;
}

interface DateRange {
  start: Date;
  end: Date;
}

export interface DashboardOverviewCategory {
  category_id: string | null;
  category_name: string;
  category_color: string | null;
  amount: string;
}

interface DashboardOverviewDay {
  date: string;
  income_total: Prisma.Decimal;
  expense_total: Prisma.Decimal;
  income_categories: DashboardOverviewCategory[];
  expense_categories: DashboardOverviewCategory[];
}

interface DashboardPreferencesRecord {
  period_start: Date;
  period_end: Date;
  is_category_breakdown_enabled: boolean;
  dashboard_hidden_categories: Array<{ category_id: string }>;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, monthValue?: string) {
    const period = this.getReportingPeriod(monthValue);
    const activeWalletWhere = this.getActiveWalletWhere(userId, period.end);

    const [balanceByType, monthlyExpenses, activeWalletCount] =
      await this.prisma.$transaction([
        this.prisma.transactions.groupBy({
          by: ['type'],
          orderBy: { type: 'asc' },
          where: {
            deleted_at: null,
            transaction_date: { lt: period.end },
            wallets: activeWalletWhere,
          },
          _sum: { amount: true },
        }),
        this.prisma.transactions.aggregate({
          where: {
            deleted_at: null,
            type: 'expense',
            transaction_date: { gte: period.start, lt: period.end },
            wallets: activeWalletWhere,
            transfers_transfers_from_transaction_idTotransactions: {
              is: null,
            },
            transfers_transfers_to_transaction_idTotransactions: {
              is: null,
            },
          },
          _sum: { amount: true },
        }),
        this.prisma.wallets.count({ where: activeWalletWhere }),
      ]);

    const totalBalance = balanceByType.reduce((total, item) => {
      const amount = new Prisma.Decimal(item._sum?.amount ?? 0);

      return item.type === 'income' ? total.plus(amount) : total.minus(amount);
    }, new Prisma.Decimal(0));

    return {
      month: period.month,
      total_balance: totalBalance.toFixed(2),
      monthly_spending: new Prisma.Decimal(
        monthlyExpenses._sum.amount ?? 0,
      ).toFixed(2),
      active_wallet_count: activeWalletCount,
    };
  }

  async getOverview(userId: string, startValue: string, endValue: string) {
    const period = this.getDateRange(startValue, endValue);
    const endExclusive = new Date(period.end);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    const activeWalletWhere = this.getActiveWalletWhere(userId, endExclusive);
    const groupedTransactions = await this.prisma.transactions.groupBy({
      by: ['transaction_date', 'type', 'category_id'],
      where: {
        deleted_at: null,
        transaction_date: { gte: period.start, lt: endExclusive },
        wallets: activeWalletWhere,
        transfers_transfers_from_transaction_idTotransactions: { is: null },
        transfers_transfers_to_transaction_idTotransactions: { is: null },
      },
      _sum: { amount: true },
      orderBy: [{ transaction_date: 'asc' }, { type: 'asc' }],
    });
    const categoryIds = groupedTransactions.flatMap((transaction) =>
      transaction.category_id ? [transaction.category_id] : [],
    );
    const categories =
      categoryIds.length === 0
        ? []
        : await this.prisma.categories.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, color: true },
          });
    const categoryById = new Map(
      categories.map((category) => [category.id, category]),
    );
    const dayByDate = new Map<string, DashboardOverviewDay>(
      this.getDatesInRange(period).map((date) => [
        this.toDateString(date),
        {
          date: this.toDateString(date),
          income_total: new Prisma.Decimal(0),
          expense_total: new Prisma.Decimal(0),
          income_categories: [] as DashboardOverviewCategory[],
          expense_categories: [] as DashboardOverviewCategory[],
        },
      ]),
    );

    for (const transaction of groupedTransactions) {
      const date = this.toDateString(transaction.transaction_date);
      const day = dayByDate.get(date);

      if (!day) {
        continue;
      }

      const amount = new Prisma.Decimal(transaction._sum.amount ?? 0);
      const category = transaction.category_id
        ? categoryById.get(transaction.category_id)
        : null;
      const categorySummary: DashboardOverviewCategory = {
        category_id: transaction.category_id,
        category_name: category?.name ?? 'Uncategorized',
        category_color: category?.color ?? null,
        amount: amount.toFixed(2),
      };

      if (transaction.type === 'income') {
        day.income_total = day.income_total.plus(amount);
        day.income_categories.push(categorySummary);
      } else {
        day.expense_total = day.expense_total.plus(amount);
        day.expense_categories.push(categorySummary);
      }
    }

    const days = [...dayByDate.values()];
    const totals = days.reduce(
      (summary, day) => ({
        income: summary.income.plus(day.income_total),
        expense: summary.expense.plus(day.expense_total),
      }),
      { income: new Prisma.Decimal(0), expense: new Prisma.Decimal(0) },
    );

    return {
      period_start: this.toDateString(period.start),
      period_end: this.toDateString(period.end),
      totals: {
        income: totals.income.toFixed(2),
        expense: totals.expense.toFixed(2),
        net: totals.income.minus(totals.expense).toFixed(2),
      },
      days: days.map((day) => ({
        date: day.date,
        income_total: day.income_total.toFixed(2),
        expense_total: day.expense_total.toFixed(2),
        income_categories: day.income_categories,
        expense_categories: day.expense_categories,
      })),
      expense_categories: this.getCategoryTotals(days, 'expense_categories'),
    };
  }

  async getPreferences(userId: string) {
    const preferences = await this.prisma.dashboard_preferences.findUnique({
      where: { user_id: userId },
      include: { dashboard_hidden_categories: true },
    });

    return this.toPreferencesResponse(preferences);
  }

  async updatePreferences(userId: string, dto: UpdateDashboardPreferencesDto) {
    const period = this.getDateRange(dto.period_start, dto.period_end);
    const hiddenCategoryIds = dto.hidden_category_ids;

    if (hiddenCategoryIds.length > 0) {
      const categories = await this.prisma.categories.findMany({
        where: {
          id: { in: hiddenCategoryIds },
          OR: [{ user_id: userId }, { user_id: null, is_system: true }],
        },
        select: { id: true },
      });

      if (categories.length !== hiddenCategoryIds.length) {
        throw new BadRequestException(
          'Hidden categories must be available to the user',
        );
      }
    }

    const preferences = await this.prisma.$transaction(async (tx) => {
      await tx.dashboard_preferences.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          period_start: period.start,
          period_end: period.end,
          is_category_breakdown_enabled: dto.is_category_breakdown_enabled,
        },
        update: {
          period_start: period.start,
          period_end: period.end,
          is_category_breakdown_enabled: dto.is_category_breakdown_enabled,
          updated_at: new Date(),
        },
      });
      await tx.dashboard_hidden_categories.deleteMany({
        where: { user_id: userId },
      });

      if (hiddenCategoryIds.length > 0) {
        await tx.dashboard_hidden_categories.createMany({
          data: hiddenCategoryIds.map((categoryId) => ({
            user_id: userId,
            category_id: categoryId,
          })),
        });
      }

      return tx.dashboard_preferences.findUniqueOrThrow({
        where: { user_id: userId },
        include: { dashboard_hidden_categories: true },
      });
    });

    return this.toPreferencesResponse(preferences);
  }

  private getReportingPeriod(monthValue?: string): ReportingPeriod {
    const month = monthValue ?? this.getCurrentBangkokMonth();

    if (!MONTH_PATTERN.test(month)) {
      throw new BadRequestException('Month must use the YYYY-MM format');
    }

    if (month > this.getCurrentBangkokMonth()) {
      throw new BadRequestException('Reporting month cannot be in the future');
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 1));

    return { month, start, end };
  }

  private getDateRange(startValue: string, endValue: string): DateRange {
    if (!DATE_PATTERN.test(startValue) || !DATE_PATTERN.test(endValue)) {
      throw new BadRequestException('Dates must use the YYYY-MM-DD format');
    }

    const start = this.toUtcDate(startValue);
    const end = this.toUtcDate(endValue);
    const today = this.toUtcDate(this.getCurrentBangkokDate());

    if (start > end) {
      throw new BadRequestException(
        'Period start must be on or before period end',
      );
    }

    if (end > today) {
      throw new BadRequestException(
        'Reporting period cannot include future dates',
      );
    }

    const dayCount =
      Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;

    if (dayCount > 10) {
      throw new BadRequestException('Reporting period cannot exceed 10 days');
    }

    return { start, end };
  }

  private getActiveWalletWhere(userId: string, periodEnd: Date) {
    return {
      user_id: userId,
      is_active: true,
      deleted_at: null,
      created_at: { lt: periodEnd },
    } satisfies Prisma.walletsWhereInput;
  }

  private getDatesInRange(period: DateRange) {
    const dates: Date[] = [];
    const current = new Date(period.start);

    while (current <= period.end) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
  }

  private getCategoryTotals(
    days: DashboardOverviewDay[],
    categoryKey: 'income_categories' | 'expense_categories',
  ) {
    const categories = new Map<string, DashboardOverviewCategory>();

    for (const day of days) {
      for (const category of day[categoryKey]) {
        const key = category.category_id ?? 'uncategorized';
        const existing = categories.get(key);
        const amount = new Prisma.Decimal(category.amount);

        categories.set(key, {
          ...category,
          amount: new Prisma.Decimal(existing?.amount ?? 0)
            .plus(amount)
            .toFixed(2),
        });
      }
    }

    return [...categories.values()].sort((first, second) =>
      new Prisma.Decimal(second.amount).comparedTo(first.amount),
    );
  }

  private toPreferencesResponse(
    preferences: DashboardPreferencesRecord | null,
  ) {
    if (!preferences) {
      const period = this.getCurrentWeekToDate();

      return {
        period_start: this.toDateString(period.start),
        period_end: this.toDateString(period.end),
        is_category_breakdown_enabled: false,
        hidden_category_ids: [],
      };
    }

    return {
      period_start: this.toDateString(preferences.period_start),
      period_end: this.toDateString(preferences.period_end),
      is_category_breakdown_enabled: preferences.is_category_breakdown_enabled,
      hidden_category_ids: preferences.dashboard_hidden_categories.map(
        (category) => category.category_id,
      ),
    };
  }

  private getCurrentWeekToDate(): DateRange {
    const end = this.toUtcDate(this.getCurrentBangkokDate());
    const daysSinceMonday = (end.getUTCDay() + 6) % 7;
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - daysSinceMonday);

    return { start, end };
  }

  private getCurrentBangkokDate() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: BANGKOK_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts();
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new BadRequestException('Could not determine the current date');
    }

    return `${year}-${month}-${day}`;
  }

  private toUtcDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (this.toDateString(date) !== value) {
      throw new BadRequestException('Date is invalid');
    }

    return date;
  }

  private toDateString(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private getCurrentBangkokMonth() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: BANGKOK_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts();
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;

    if (!year || !month) {
      throw new BadRequestException('Could not determine the reporting month');
    }

    return `${year}-${month}`;
  }
}
