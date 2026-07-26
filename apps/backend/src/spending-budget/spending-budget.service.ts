import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, spending_budget_period } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpendingBudgetDto } from './dto/create-spending-budget.dto';
import { FindSpendingBudgetOverviewDto } from './dto/find-spending-budget-overview.dto';
import { UpdateSpendingBudgetDto } from './dto/update-spending-budget.dto';

const BANGKOK_TIME_ZONE = 'Asia/Bangkok';
const UNCATEGORIZED_KEY = '__uncategorized__';

const spendingBudgetInclude = {
  spending_budget_categories: {
    include: {
      categories: {
        select: { id: true, name: true, color: true },
      },
    },
  },
} satisfies Prisma.spending_budgetsInclude;

interface SpendingBudgetCategoryRecord {
  category_id: string;
  categories: {
    id: string;
    name: string;
    color: string | null;
  };
}

interface SpendingBudgetRecord {
  id: string;
  user_id: string;
  name: string;
  amount: Prisma.Decimal;
  period: spending_budget_period;
  includes_uncategorized: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  spending_budget_categories: SpendingBudgetCategoryRecord[];
}

interface CurrentPeriod {
  start: Date;
  end: Date;
  endExclusive: Date;
}

@Injectable()
export class SpendingBudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const budgets = await this.prisma.spending_budgets.findMany({
      where: { user_id: userId },
      include: spendingBudgetInclude,
      orderBy: [{ period: 'asc' }, { name: 'asc' }],
    });

    return budgets.map((budget) => this.toBudgetResponse(budget));
  }

  async getOverview(userId: string, query: FindSpendingBudgetOverviewDto) {
    const period = this.resolvePeriod(query);
    const periodType = query.period;
    const budgets = await this.prisma.spending_budgets.findMany({
      where: {
        user_id: userId,
        is_active: true,
        period: periodType,
      },
      include: spendingBudgetInclude,
      orderBy: { name: 'asc' },
    });
    if (budgets.length === 0) {
      return {
        period: periodType,
        period_start: this.toDateString(period.start),
        period_end: this.toDateString(period.end),
        budgets: [],
      };
    }

    const totals = await this.prisma.transactions.groupBy({
      by: ['category_id'],
      where: {
        deleted_at: null,
        type: 'expense',
        transaction_date: {
          gte: period.start,
          lt: period.endExclusive,
        },
        wallets: {
          user_id: userId,
          wallet_type: 'normal',
          is_active: true,
          deleted_at: null,
          created_at: { lt: period.endExclusive },
        },
        transfers_transfers_from_transaction_idTotransactions: { is: null },
        transfers_transfers_to_transaction_idTotransactions: { is: null },
      },
      _sum: { amount: true },
    });
    const amountByCategory = new Map(
      totals.map((total) => [
        total.category_id ?? UNCATEGORIZED_KEY,
        new Prisma.Decimal(total._sum.amount ?? 0),
      ]),
    );

    return {
      period: periodType,
      period_start: this.toDateString(period.start),
      period_end: this.toDateString(period.end),
      budgets: budgets.map((budget) =>
        this.toOverviewResponse(budget, amountByCategory),
      ),
    };
  }

  async create(userId: string, dto: CreateSpendingBudgetDto) {
    const name = this.normalizeName(dto.name);
    this.validateAmount(dto.amount);
    const categoryIds = this.normalizeCategoryIds(dto.category_ids);
    await this.validateCategorySelection(
      userId,
      categoryIds,
      dto.includes_uncategorized,
    );

    const budget = await this.prisma.spending_budgets.create({
      data: {
        user_id: userId,
        name,
        amount: dto.amount,
        period: dto.period,
        includes_uncategorized: dto.includes_uncategorized,
        spending_budget_categories: {
          create: categoryIds.map((categoryId) => ({
            category_id: categoryId,
          })),
        },
      },
      include: spendingBudgetInclude,
    });

    return this.toBudgetResponse(budget);
  }

  async update(userId: string, id: string, dto: UpdateSpendingBudgetDto) {
    const existing = await this.findOwnedBudget(userId, id);
    const name =
      dto.name === undefined ? existing.name : this.normalizeName(dto.name);
    const amount =
      dto.amount === undefined ? Number(existing.amount) : dto.amount;
    const categoryIds =
      dto.category_ids === undefined
        ? existing.spending_budget_categories.map(
            (category) => category.category_id,
          )
        : this.normalizeCategoryIds(dto.category_ids);
    const includesUncategorized =
      dto.includes_uncategorized ?? existing.includes_uncategorized;

    this.validateAmount(amount);
    await this.validateCategorySelection(
      userId,
      categoryIds,
      includesUncategorized,
    );

    const budget = await this.prisma.$transaction(async (tx) => {
      if (dto.category_ids !== undefined) {
        await tx.spending_budget_categories.deleteMany({
          where: { budget_id: id },
        });

        if (categoryIds.length > 0) {
          await tx.spending_budget_categories.createMany({
            data: categoryIds.map((categoryId) => ({
              budget_id: id,
              category_id: categoryId,
            })),
          });
        }
      }

      return tx.spending_budgets.update({
        where: { id },
        data: {
          name,
          amount,
          period: dto.period ?? existing.period,
          includes_uncategorized: includesUncategorized,
          is_active: dto.is_active ?? existing.is_active,
          updated_at: new Date(),
        },
        include: spendingBudgetInclude,
      });
    });

    return this.toBudgetResponse(budget);
  }

  async delete(userId: string, id: string) {
    await this.findOwnedBudget(userId, id);
    await this.prisma.spending_budgets.delete({ where: { id } });

    return { id };
  }

  async pauseEmptyBudgets(tx: Prisma.TransactionClient, userId: string) {
    await tx.spending_budgets.updateMany({
      where: {
        user_id: userId,
        is_active: true,
        includes_uncategorized: false,
        spending_budget_categories: { none: {} },
      },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });
  }

  private async findOwnedBudget(userId: string, id: string) {
    const budget = await this.prisma.spending_budgets.findFirst({
      where: { id, user_id: userId },
      include: spendingBudgetInclude,
    });

    if (!budget) {
      throw new NotFoundException('Spending budget not found');
    }

    return budget;
  }

  private async validateCategorySelection(
    userId: string,
    categoryIds: string[],
    includesUncategorized: boolean,
  ) {
    if (categoryIds.length === 0 && !includesUncategorized) {
      throw new BadRequestException(
        'Select at least one category or uncategorized expenses',
      );
    }

    if (categoryIds.length === 0) {
      return;
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
        'Categories must be available expense categories',
      );
    }
  }

  private normalizeCategoryIds(categoryIds: string[]) {
    const uniqueCategoryIds = [...new Set(categoryIds)];

    if (uniqueCategoryIds.length !== categoryIds.length) {
      throw new BadRequestException('Categories cannot be duplicated');
    }

    return uniqueCategoryIds;
  }

  private normalizeName(name: string) {
    const normalizedName = name.trim();

    if (normalizedName.length < 3 || normalizedName.length > 100) {
      throw new BadRequestException(
        'Spending budget name must be between 3 and 100 characters',
      );
    }

    return normalizedName;
  }

  private validateAmount(amount: number) {
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isInteger(amount * 100)
    ) {
      throw new BadRequestException(
        'Budget amount must be greater than 0 with no more than two decimal places',
      );
    }
  }

  private resolvePeriod(query: FindSpendingBudgetOverviewDto): CurrentPeriod {
    const { period } = query;
    const today = this.toUtcDate(this.getCurrentBangkokDate());

    if (period === 'weekly') {
      this.assertOnlyPeriodFilters(query, ['start', 'end']);

      if (query.start === undefined && query.end === undefined) {
        const start = new Date(today);
        const daysSinceMonday = (today.getUTCDay() + 6) % 7;
        start.setUTCDate(today.getUTCDate() - daysSinceMonday);

        return this.toCurrentPeriod(start, today);
      }

      if (!query.start || !query.end) {
        throw new BadRequestException(
          'Weekly overview requires both start and end dates',
        );
      }

      const start = this.toUtcDate(query.start);
      const end = this.toUtcDate(query.end);
      const dayCount =
        Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;

      if (dayCount !== 7) {
        throw new BadRequestException(
          'Weekly overview must cover exactly seven consecutive days',
        );
      }

      return this.toCurrentPeriod(start, end);
    }

    if (period === 'daily') {
      this.assertOnlyPeriodFilters(query, ['date']);
      const date = query.date ? this.toUtcDate(query.date) : today;

      return this.toCurrentPeriod(date, date);
    }

    if (period === 'monthly') {
      this.assertOnlyPeriodFilters(query, ['month']);
      const { year, month } = query.month
        ? this.toMonthParts(query.month)
        : {
            year: today.getUTCFullYear(),
            month: today.getUTCMonth() + 1,
          };
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0));

      return this.toCurrentPeriod(start, end);
    }

    this.assertOnlyPeriodFilters(query, ['year']);
    const year = query.year
      ? this.toYearNumber(query.year)
      : today.getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));

    return this.toCurrentPeriod(start, end);
  }

  private assertOnlyPeriodFilters(
    query: FindSpendingBudgetOverviewDto,
    allowedFilters: string[],
  ) {
    const unsupportedFilter = ['date', 'start', 'end', 'month', 'year'].find(
      (filter) =>
        query[filter as keyof FindSpendingBudgetOverviewDto] !== undefined &&
        !allowedFilters.includes(filter),
    );

    if (unsupportedFilter) {
      throw new BadRequestException(
        `Filter "${unsupportedFilter}" is not supported for ${query.period} overview`,
      );
    }
  }

  private toCurrentPeriod(start: Date, end: Date): CurrentPeriod {
    const endExclusive = new Date(end);
    endExclusive.setUTCDate(end.getUTCDate() + 1);

    return { start, end, endExclusive };
  }

  private toBudgetResponse(budget: SpendingBudgetRecord) {
    return {
      id: budget.id,
      name: budget.name,
      amount: budget.amount.toFixed(2),
      period: budget.period,
      includes_uncategorized: budget.includes_uncategorized,
      is_active: budget.is_active,
      created_at: budget.created_at,
      updated_at: budget.updated_at,
      categories: budget.spending_budget_categories.map((category) => ({
        id: category.categories.id,
        name: category.categories.name,
        color: category.categories.color,
      })),
    };
  }

  private toOverviewResponse(
    budget: SpendingBudgetRecord,
    amountByCategory: Map<string, Prisma.Decimal>,
  ) {
    const categoryTotal = budget.spending_budget_categories.reduce(
      (total, category) =>
        total.plus(amountByCategory.get(category.category_id) ?? 0),
      new Prisma.Decimal(0),
    );
    const spent = budget.includes_uncategorized
      ? categoryTotal.plus(amountByCategory.get(UNCATEGORIZED_KEY) ?? 0)
      : categoryTotal;
    const percentage = spent.dividedBy(budget.amount).times(100);
    const roundedPercentage = Number(percentage.toFixed(2));
    const status = percentage.greaterThanOrEqualTo(100)
      ? 'over_budget'
      : percentage.greaterThanOrEqualTo(80)
        ? 'near_limit'
        : 'on_track';

    return {
      ...this.toBudgetResponse(budget),
      spent: spent.toFixed(2),
      remaining: budget.amount.minus(spent).toFixed(2),
      percentage: roundedPercentage,
      status,
    };
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
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!dateMatch) {
      throw new BadRequestException('Date must use YYYY-MM-DD format');
    }

    const [, yearValue, monthValue, dayValue] = dateMatch;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException('Date is not a valid calendar date');
    }

    return date;
  }

  private toMonthParts(value: string) {
    const monthMatch = /^([1-9]\d{3})-(0[1-9]|1[0-2])$/.exec(value);

    if (!monthMatch) {
      throw new BadRequestException('Month must use YYYY-MM format');
    }

    return {
      year: Number(monthMatch[1]),
      month: Number(monthMatch[2]),
    };
  }

  private toYearNumber(value: string) {
    if (!/^[1-9]\d{3}$/.test(value)) {
      throw new BadRequestException('Year must use YYYY format');
    }

    return Number(value);
  }

  private toDateString(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
