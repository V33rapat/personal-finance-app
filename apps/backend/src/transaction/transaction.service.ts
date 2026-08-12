import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, transaction_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { applyWalletBalanceDelta } from '../wallet/wallet-balance.util';
import { FindDailyTransactionDto } from './dto/find-daily-transaction.dto';

const DAILY_TRANSACTION_PAGE_SIZE = 50;

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTransactionDto, userId: string) {
    const transactionDate = this.toTransactionDate(dto.transaction_date);
    await this.findEligibleTransactionWallet(userId, dto.wallet_id);

    if (dto.category_id) {
      const category = await this.prisma.categories.findFirst({
        where: {
          id: dto.category_id,
          type: dto.type,
          OR: [{ user_id: userId }, { user_id: null, is_system: true }],
        },
      });

      if (!category) {
        throw new NotFoundException('ไม่พบหมวดหมู่');
      }
    }

    if (dto.template_id) {
      const template = await this.prisma.transaction_templates.findFirst({
        where: {
          id: dto.template_id,
          user_id: userId,
          is_active: true,
        },
      });

      if (!template) {
        throw new NotFoundException('Transaction template not found');
      }
    }

    const balanceChange = dto.type === 'income' ? dto.amount : -dto.amount;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const createdTransaction = await tx.transactions.create({
        data: {
          name: dto.name,
          amount: dto.amount,
          type: dto.type,
          wallet_id: dto.wallet_id,
          category_id: dto.category_id || null,
          template_id: dto.template_id || null,
          transaction_date: transactionDate,
          note: dto.note || null,
        },
      });

      await applyWalletBalanceDelta(tx, dto.wallet_id, balanceChange);

      return createdTransaction;
    });

    return transaction;
  }

  async findAll(userId: string, walletId?: string) {
    const where = walletId
      ? { wallets: { user_id: userId, id: walletId }, deleted_at: null }
      : { wallets: { user_id: userId }, deleted_at: null };

    return this.prisma.transactions.findMany({
      where,
      include: { categories: true, wallets: true },
      orderBy: { transaction_date: 'desc' },
    });
  }

  async findDaily(userId: string, query: FindDailyTransactionDto) {
    const selectedDate = this.toTransactionDate(query.date);
    const page = query.page ?? 1;
    const normalizedSearch = query.search?.trim();

    const wallet = await this.prisma.wallets.findFirst({
      where: {
        id: query.walletId,
        user_id: userId,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (!wallet) {
      throw new NotFoundException('ไม่พบกระเป๋าเงิน');
    }

    const dailyWhere: Prisma.transactionsWhereInput = {
      wallet_id: wallet.id,
      deleted_at: null,
      transaction_date: selectedDate,
    };
    const itemWhere: Prisma.transactionsWhereInput = {
      ...dailyWhere,
      ...(query.type ? { type: query.type } : {}),
      ...(query.categoryId ? { category_id: query.categoryId } : {}),
      ...(normalizedSearch
        ? {
            OR: [
              {
                name: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                note: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [summaryRows, total, transactions] = await this.prisma.$transaction([
      this.prisma.transactions.groupBy({
        by: ['type'],
        where: dailyWhere,
        orderBy: { type: 'asc' },
        _sum: { amount: true },
      }),
      this.prisma.transactions.count({ where: itemWhere }),
      this.prisma.transactions.findMany({
        where: itemWhere,
        include: {
          categories: true,
          wallets: true,
          transfers_transfers_from_transaction_idTotransactions: {
            select: { allocation_id: true },
          },
          transfers_transfers_to_transaction_idTotransactions: {
            select: { allocation_id: true },
          },
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * DAILY_TRANSACTION_PAGE_SIZE,
        take: DAILY_TRANSACTION_PAGE_SIZE,
      }),
    ]);

    const summary = summaryRows.reduce(
      (current, row) => {
        const amount = Number(row._sum?.amount ?? 0);

        if (row.type === transaction_type.income) {
          current.income += amount;
        } else {
          current.expense += amount;
        }

        return current;
      },
      { income: 0, expense: 0 },
    );

    return {
      date: query.date,
      summary: {
        income: summary.income.toFixed(2),
        expense: summary.expense.toFixed(2),
        net: (summary.income - summary.expense).toFixed(2),
      },
      items: transactions.map((transaction) => {
        const transfer =
          transaction.transfers_transfers_from_transaction_idTotransactions ??
          transaction.transfers_transfers_to_transaction_idTotransactions;

        return {
          ...transaction,
          management: transfer
            ? transfer.allocation_id
              ? 'allocation'
              : 'transfer'
            : 'manual',
        };
      }),
      page,
      has_more: page * DAILY_TRANSACTION_PAGE_SIZE < total,
    };
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transactions.findFirst({
      where: {
        id,
        wallets: { user_id: userId },
        deleted_at: null,
      },
      include: { categories: true, wallets: true },
    });

    if (!transaction) {
      throw new NotFoundException('ไม่พบรายการ');
    }

    return transaction;
  }

  async update(userId: string, dto: UpdateTransactionDto, id: string) {
    const transactionDate = dto.transaction_date
      ? this.toTransactionDate(dto.transaction_date)
      : undefined;
    const existing = await this.findOne(userId, id);
    await this.assertNotTransferManagedTransaction(id);
    const targetWalletId = dto.wallet_id ?? existing.wallet_id;

    // Legacy transactions in a parent wallet must be moved to an eligible wallet before they can change.
    await this.findEligibleTransactionWallet(userId, targetWalletId);

    if (dto.category_id) {
      const category = await this.prisma.categories.findFirst({
        where: {
          id: dto.category_id,
          OR: [{ user_id: userId }, { user_id: null, is_system: true }],
        },
      });

      if (!category) {
        throw new NotFoundException('ไม่พบหมวดหมู่');
      }
    }

    const newAmount =
      dto.amount !== undefined ? dto.amount : Number(existing.amount);
    const newType = dto.type ?? existing.type;

    const oldBalanceEffect =
      existing.type === 'income'
        ? Number(existing.amount)
        : -Number(existing.amount);

    const newBalanceEffect =
      newType === 'income' ? Number(newAmount) : -Number(newAmount);

    const balanceDelta = newBalanceEffect - oldBalanceEffect;
    const walletChanged = targetWalletId !== existing.wallet_id;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const updatedTransaction = await tx.transactions.update({
        where: { id },
        data: {
          ...(dto.wallet_id !== undefined && { wallet_id: targetWalletId }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.note !== undefined && { note: dto.note }),
          ...(transactionDate !== undefined && {
            transaction_date: transactionDate,
          }),
          ...(dto.category_id !== undefined && {
            category_id: dto.category_id || null,
          }),
        },
        include: { categories: true, wallets: true },
      });

      if (walletChanged) {
        await applyWalletBalanceDelta(
          tx,
          existing.wallet_id,
          -oldBalanceEffect,
        );
        await applyWalletBalanceDelta(tx, targetWalletId, newBalanceEffect);
      } else if (balanceDelta !== 0) {
        await applyWalletBalanceDelta(tx, existing.wallet_id, balanceDelta);
      }

      return updatedTransaction;
    });

    return transaction;
  }

  async delete(userId: string, id: string) {
    const transaction = await this.findOne(userId, id);
    await this.assertNotTransferManagedTransaction(id);

    const wallet = await this.prisma.wallets.findFirst({
      where: { id: transaction.wallet_id, user_id: userId },
    });

    if (!wallet) {
      throw new ForbiddenException('ไม่มีสิทธิ์ลบรายการนี้');
    }

    const balanceChange =
      transaction.type === 'income'
        ? -Number(transaction.amount)
        : Number(transaction.amount);

    return this.prisma.$transaction(async (tx) => {
      await applyWalletBalanceDelta(tx, transaction.wallet_id, balanceChange);

      // Soft delete
      return tx.transactions.update({
        where: { id },
        data: { deleted_at: new Date() },
      });
    });
  }

  private async assertNotTransferManagedTransaction(id: string) {
    const transfer = await this.prisma.transfers.findFirst({
      where: {
        deleted_at: null,
        OR: [{ from_transaction_id: id }, { to_transaction_id: id }],
      },
      select: { id: true },
    });

    if (transfer) {
      throw new BadRequestException(
        'This transaction belongs to a transfer. Please edit or delete it through Transfer.',
      );
    }
  }

  private async findEligibleTransactionWallet(
    userId: string,
    walletId: string,
  ) {
    const wallet = await this.prisma.wallets.findFirst({
      where: {
        id: walletId,
        user_id: userId,
        deleted_at: null,
        is_active: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException('ไม่พบกระเป๋าเงิน');
    }

    const activeSubWallet = await this.prisma.wallets.findFirst({
      where: {
        parent_wallet_id: wallet.id,
        deleted_at: null,
        is_active: true,
      },
      select: { id: true },
    });

    if (activeSubWallet) {
      throw new BadRequestException(
        'Please record transactions in an active sub-wallet.',
      );
    }

    return wallet;
  }

  private toTransactionDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Invalid transaction date');
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException('Invalid transaction date');
    }

    if (value > this.getBangkokDateString()) {
      throw new BadRequestException('Transaction date cannot be in the future');
    }

    return date;
  }

  private getBangkokDateString(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value;

    return `${part('year')}-${part('month')}-${part('day')}`;
  }
}
