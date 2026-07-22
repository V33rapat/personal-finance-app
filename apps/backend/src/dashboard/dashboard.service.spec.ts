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
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      transactions: {
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      wallets: { count: jest.fn() },
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
});
