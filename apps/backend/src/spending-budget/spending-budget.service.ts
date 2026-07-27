import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  spending_budget_period,
  spending_budget_wallet_scope,
  wallet_type,
} from '@prisma/client';
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
  spending_budget_wallets: {
    include: {
      wallets: {
        select: {
          id: true,
          name: true,
          wallet_type: true,
          is_active: true,
          deleted_at: true,
          wallets: { select: { name: true } },
          other_wallets: {
            where: { is_active: true, deleted_at: null },
            select: { id: true },
          },
        },
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

interface SpendingBudgetWalletRecord {
  wallet_id: string;
  wallets: {
    id: string;
    name: string;
    wallet_type: wallet_type;
    is_active: boolean;
    deleted_at: Date | null;
    wallets: { name: string } | null;
    other_wallets: Array<{ id: string }>;
  };
}

interface SpendingBudgetRecord {
  id: string;
  user_id: string;
  name: string;
  amount: Prisma.Decimal;
  period: spending_budget_period;
  wallet_scope: spending_budget_wallet_scope;
  includes_uncategorized: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  spending_budget_categories: SpendingBudgetCategoryRecord[];
  spending_budget_wallets: SpendingBudgetWalletRecord[];
}

interface CurrentPeriod {
  start: Date;
  end: Date;
  endExclusive: Date;
}

type AmountByCategoryAndWallet = Map<string, Map<string, Prisma.Decimal>>;

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
      by: ['category_id', 'wallet_id'],
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
          other_wallets: {
            none: { is_active: true, deleted_at: null },
          },
        },
        transfers_transfers_from_transaction_idTotransactions: { is: null },
        transfers_transfers_to_transaction_idTotransactions: { is: null },
      },
      _sum: { amount: true },
    });
    const amountByCategoryAndWallet: AmountByCategoryAndWallet = new Map();

    totals.forEach((total) => {
      const categoryKey = total.category_id ?? UNCATEGORIZED_KEY;
      const walletAmounts =
        amountByCategoryAndWallet.get(categoryKey) ??
        new Map<string, Prisma.Decimal>();

      walletAmounts.set(
        total.wallet_id,
        new Prisma.Decimal(total._sum.amount ?? 0),
      );
      amountByCategoryAndWallet.set(categoryKey, walletAmounts);
    });

    return {
      period: periodType,
      period_start: this.toDateString(period.start),
      period_end: this.toDateString(period.end),
      budgets: budgets.map((budget) =>
        this.toOverviewResponse(budget, amountByCategoryAndWallet),
      ),
    };
  }

  async create(userId: string, dto: CreateSpendingBudgetDto) {
    const name = this.normalizeName(dto.name);
    this.validateAmount(dto.amount);
    const categoryIds = this.normalizeCategoryIds(dto.category_ids);
    const walletIds = this.normalizeWalletIds(dto.wallet_ids);
    await this.validateCategorySelection(
      userId,
      categoryIds,
      dto.includes_uncategorized,
    );
    await this.validateWalletSelection(userId, dto.wallet_scope, walletIds);
    await this.assertNoDuplicateActiveBudget(userId, {
      period: dto.period,
      categoryIds,
      includesUncategorized: dto.includes_uncategorized,
      walletScope: dto.wallet_scope,
      walletIds,
    });

    const budget = await this.prisma.spending_budgets.create({
      data: {
        user_id: userId,
        name,
        amount: dto.amount,
        period: dto.period,
        wallet_scope: dto.wallet_scope,
        includes_uncategorized: dto.includes_uncategorized,
        spending_budget_categories: {
          create: categoryIds.map((categoryId) => ({
            category_id: categoryId,
          })),
        },
        spending_budget_wallets:
          dto.wallet_scope === spending_budget_wallet_scope.selected
            ? {
                create: walletIds.map((walletId) => ({
                  wallet_id: walletId,
                })),
              }
            : undefined,
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
    const isWalletSelectionUpdated =
      dto.wallet_scope !== undefined || dto.wallet_ids !== undefined;

    if ((dto.wallet_scope === undefined) !== (dto.wallet_ids === undefined)) {
      throw new BadRequestException(
        'Wallet scope and wallet ids must be updated together',
      );
    }

    const walletScope = dto.wallet_scope ?? existing.wallet_scope;
    const walletIds =
      dto.wallet_ids === undefined
        ? existing.spending_budget_wallets.map((wallet) => wallet.wallet_id)
        : this.normalizeWalletIds(dto.wallet_ids);
    const existingWalletIds = existing.spending_budget_wallets.map(
      (wallet) => wallet.wallet_id,
    );
    const period = dto.period ?? existing.period;
    const isActive = dto.is_active ?? existing.is_active;

    this.validateAmount(amount);
    await this.validateCategorySelection(
      userId,
      categoryIds,
      includesUncategorized,
    );
    await this.validateWalletSelection(
      userId,
      walletScope,
      walletIds,
      existingWalletIds,
    );

    if (isActive) {
      await this.assertNoDuplicateActiveBudget(
        userId,
        {
          period,
          categoryIds,
          includesUncategorized,
          walletScope,
          walletIds,
        },
        id,
      );
    }

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

      if (isWalletSelectionUpdated) {
        await tx.spending_budget_wallets.deleteMany({
          where: { budget_id: id },
        });

        if (walletScope === spending_budget_wallet_scope.selected) {
          await tx.spending_budget_wallets.createMany({
            data: walletIds.map((walletId) => ({
              budget_id: id,
              wallet_id: walletId,
            })),
          });
        }
      }

      return tx.spending_budgets.update({
        where: { id },
        data: {
          name,
          amount,
          period,
          wallet_scope: walletScope,
          includes_uncategorized: includesUncategorized,
          is_active: isActive,
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

  private normalizeWalletIds(walletIds: string[]) {
    const uniqueWalletIds = [...new Set(walletIds)];

    if (uniqueWalletIds.length !== walletIds.length) {
      throw new BadRequestException('Wallets cannot be duplicated');
    }

    return uniqueWalletIds;
  }

  private async validateWalletSelection(
    userId: string,
    walletScope: spending_budget_wallet_scope,
    walletIds: string[],
    existingWalletIds: string[] = [],
  ) {
    if (walletScope === spending_budget_wallet_scope.all) {
      if (walletIds.length > 0) {
        throw new BadRequestException(
          'All wallet budgets cannot include selected wallets',
        );
      }

      return;
    }

    if (walletIds.length === 0) {
      throw new BadRequestException('Select at least one wallet');
    }

    const existingWalletIdSet = new Set(existingWalletIds);
    const newWalletIds = walletIds.filter(
      (walletId) => !existingWalletIdSet.has(walletId),
    );

    if (newWalletIds.length === 0) {
      return;
    }

    const wallets = await this.prisma.wallets.findMany({
      where: {
        id: { in: newWalletIds },
        user_id: userId,
        wallet_type: wallet_type.normal,
        is_active: true,
        deleted_at: null,
        other_wallets: {
          none: { is_active: true, deleted_at: null },
        },
      },
      select: { id: true },
    });

    if (wallets.length !== newWalletIds.length) {
      throw new BadRequestException(
        'Wallets must be available normal transaction wallets',
      );
    }
  }

  private async assertNoDuplicateActiveBudget(
    userId: string,
    values: {
      period: spending_budget_period;
      categoryIds: string[];
      includesUncategorized: boolean;
      walletScope: spending_budget_wallet_scope;
      walletIds: string[];
    },
    excludeBudgetId?: string,
  ) {
    const budgets = await this.prisma.spending_budgets.findMany({
      where: {
        user_id: userId,
        is_active: true,
        period: values.period,
        ...(excludeBudgetId ? { id: { not: excludeBudgetId } } : {}),
      },
      include: spendingBudgetInclude,
    });

    const hasDuplicate = budgets.some((budget) => {
      if (
        budget.includes_uncategorized !== values.includesUncategorized ||
        budget.wallet_scope !== values.walletScope
      ) {
        return false;
      }

      const budgetCategoryIds = budget.spending_budget_categories.map(
        (category) => category.category_id,
      );
      const budgetWalletIds = budget.spending_budget_wallets.map(
        (wallet) => wallet.wallet_id,
      );

      return (
        this.hasSameIds(budgetCategoryIds, values.categoryIds) &&
        this.hasSameIds(budgetWalletIds, values.walletIds)
      );
    });

    if (hasDuplicate) {
      throw new BadRequestException(
        'An active spending budget with the same scope already exists',
      );
    }
  }

  private hasSameIds(left: string[], right: string[]) {
    if (left.length !== right.length) {
      return false;
    }

    const rightIds = new Set(right);
    return left.every((id) => rightIds.has(id));
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
    const wallets =
      budget.wallet_scope === spending_budget_wallet_scope.selected
        ? budget.spending_budget_wallets.map((budgetWallet) => ({
            id: budgetWallet.wallets.id,
            name: budgetWallet.wallets.name,
            parent_name: budgetWallet.wallets.wallets?.name ?? null,
            is_available: this.isBudgetWalletAvailable(budgetWallet),
          }))
        : [];

    return {
      id: budget.id,
      name: budget.name,
      amount: budget.amount.toFixed(2),
      period: budget.period,
      wallet_scope: budget.wallet_scope,
      includes_uncategorized: budget.includes_uncategorized,
      is_active: budget.is_active,
      created_at: budget.created_at,
      updated_at: budget.updated_at,
      wallets,
      unavailable_wallet_count: wallets.filter((wallet) => !wallet.is_available)
        .length,
      categories: budget.spending_budget_categories.map((category) => ({
        id: category.categories.id,
        name: category.categories.name,
        color: category.categories.color,
      })),
    };
  }

  private toOverviewResponse(
    budget: SpendingBudgetRecord,
    amountByCategoryAndWallet: AmountByCategoryAndWallet,
  ) {
    const selectedWalletIds =
      budget.wallet_scope === spending_budget_wallet_scope.selected
        ? this.getAvailableSelectedWalletIds(budget)
        : null;
    const categoryTotal = budget.spending_budget_categories.reduce(
      (total, category) =>
        total.plus(
          this.getCategoryTotal(
            amountByCategoryAndWallet,
            category.category_id,
            selectedWalletIds,
          ),
        ),
      new Prisma.Decimal(0),
    );
    const spent = budget.includes_uncategorized
      ? categoryTotal.plus(
          this.getCategoryTotal(
            amountByCategoryAndWallet,
            UNCATEGORIZED_KEY,
            selectedWalletIds,
          ),
        )
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

  private getAvailableSelectedWalletIds(budget: SpendingBudgetRecord) {
    return budget.spending_budget_wallets
      .filter((wallet) => this.isBudgetWalletAvailable(wallet))
      .map((wallet) => wallet.wallet_id);
  }

  private isBudgetWalletAvailable(wallet: SpendingBudgetWalletRecord) {
    return (
      wallet.wallets.wallet_type === wallet_type.normal &&
      wallet.wallets.is_active &&
      wallet.wallets.deleted_at === null &&
      wallet.wallets.other_wallets.length === 0
    );
  }

  private getCategoryTotal(
    amountByCategoryAndWallet: AmountByCategoryAndWallet,
    categoryId: string,
    selectedWalletIds: string[] | null,
  ) {
    const walletAmounts = amountByCategoryAndWallet.get(categoryId);

    if (!walletAmounts) {
      return new Prisma.Decimal(0);
    }

    const amounts = selectedWalletIds
      ? selectedWalletIds.map(
          (walletId) => walletAmounts.get(walletId) ?? new Prisma.Decimal(0),
        )
      : [...walletAmounts.values()];

    return amounts.reduce(
      (total, amount) => total.plus(amount),
      new Prisma.Decimal(0),
    );
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
