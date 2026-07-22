import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const BANGKOK_TIME_ZONE = 'Asia/Bangkok';
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

interface ReportingPeriod {
  month: string;
  start: Date;
  end: Date;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, monthValue?: string) {
    const period = this.getReportingPeriod(monthValue);
    const activeWalletWhere: Prisma.walletsWhereInput = {
      user_id: userId,
      is_active: true,
      deleted_at: null,
      created_at: { lt: period.end },
    };

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
