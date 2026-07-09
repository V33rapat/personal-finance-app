import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaTransaction = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

type BalanceValue = Prisma.Decimal | number | string;

export async function applyWalletBalanceDelta(
  tx: PrismaTransaction,
  walletId: string,
  delta: BalanceValue,
) {
  const balanceDelta = new Prisma.Decimal(delta);

  if (balanceDelta.isZero()) {
    return;
  }

  const wallet = await tx.wallets.update({
    where: { id: walletId },
    data: {
      balance: { increment: balanceDelta },
      updated_at: new Date(),
    },
    select: { parent_wallet_id: true },
  });

  if (!wallet.parent_wallet_id) {
    return;
  }

  await tx.wallets.update({
    where: { id: wallet.parent_wallet_id },
    data: {
      balance: { increment: balanceDelta },
      updated_at: new Date(),
    },
  });
}

export async function applyParentWalletBalanceDelta(
  tx: PrismaTransaction,
  walletId: string,
  delta: BalanceValue,
) {
  const balanceDelta = new Prisma.Decimal(delta);

  if (balanceDelta.isZero()) {
    return;
  }

  const wallet = await tx.wallets.findUnique({
    where: { id: walletId },
    select: { parent_wallet_id: true },
  });

  if (!wallet?.parent_wallet_id) {
    return;
  }

  await tx.wallets.update({
    where: { id: wallet.parent_wallet_id },
    data: {
      balance: { increment: balanceDelta },
      updated_at: new Date(),
    },
  });
}

export async function syncWalletBalances(prisma: PrismaService, userId: string) {
  const wallets = await prisma.wallets.findMany({
    where: {
      user_id: userId,
      deleted_at: null,
    },
    select: {
      id: true,
      parent_wallet_id: true,
      balance: true,
    },
  });

  const walletIds = wallets.map((wallet) => wallet.id);

  if (walletIds.length === 0) {
    return;
  }

  const ownBalances = new Map(
    wallets.map((wallet) => [wallet.id, new Prisma.Decimal(0)]),
  );
  const childrenByParent = new Map<string, string[]>();

  wallets.forEach((wallet) => {
    if (!wallet.parent_wallet_id) return;

    const children = childrenByParent.get(wallet.parent_wallet_id) ?? [];
    children.push(wallet.id);
    childrenByParent.set(wallet.parent_wallet_id, children);
  });

  const transactions = await prisma.transactions.findMany({
    where: {
      wallet_id: { in: walletIds },
      deleted_at: null,
    },
    select: {
      wallet_id: true,
      type: true,
      amount: true,
    },
  });

  transactions.forEach((transaction) => {
    const currentBalance =
      ownBalances.get(transaction.wallet_id) ?? new Prisma.Decimal(0);
    const amount = new Prisma.Decimal(transaction.amount);
    const nextBalance =
      transaction.type === 'income'
        ? currentBalance.plus(amount)
        : currentBalance.minus(amount);

    ownBalances.set(transaction.wallet_id, nextBalance);
  });

  const aggregateBalances = new Map<string, Prisma.Decimal>();

  const calculateAggregateBalance = (
    walletId: string,
    visited = new Set<string>(),
  ): Prisma.Decimal => {
    if (aggregateBalances.has(walletId)) {
      return aggregateBalances.get(walletId) as Prisma.Decimal;
    }

    if (visited.has(walletId)) {
      return ownBalances.get(walletId) ?? new Prisma.Decimal(0);
    }

    visited.add(walletId);

    const children = childrenByParent.get(walletId) ?? [];
    const aggregateBalance = children.reduce(
      (sum, childId) => sum.plus(calculateAggregateBalance(childId, visited)),
      ownBalances.get(walletId) ?? new Prisma.Decimal(0),
    );

    aggregateBalances.set(walletId, aggregateBalance);
    visited.delete(walletId);

    return aggregateBalance;
  };

  const updates = wallets
    .map((wallet) => ({
      id: wallet.id,
      currentBalance: new Prisma.Decimal(wallet.balance),
      nextBalance: calculateAggregateBalance(wallet.id),
    }))
    .filter(({ currentBalance, nextBalance }) => !currentBalance.equals(nextBalance))
    .map(({ id, nextBalance }) =>
      prisma.wallets.update({
        where: { id },
        data: {
          balance: nextBalance,
          updated_at: new Date(),
        },
      }),
    );

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}
