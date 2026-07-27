import '../src/config/load-env';
import {
  PrismaClient,
  spending_budget_period,
  transaction_type,
  wallet_type,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const primaryEmail =
  process.env.PLAYWRIGHT_E2E_EMAIL ?? 'playwright-e2e@walpaca.test';
const secondaryEmail =
  process.env.PLAYWRIGHT_E2E_SECONDARY_EMAIL ??
  'playwright-e2e-secondary@walpaca.test';
const password = process.env.PLAYWRIGHT_E2E_PASSWORD ?? 'PlaywrightE2E!123';
const reportingDate = new Date('2026-07-20T00:00:00.000Z');

async function resetUserData(userId: string) {
  const wallets = await prisma.wallets.findMany({
    where: { user_id: userId },
    select: { id: true },
  });
  const walletIds = wallets.map((wallet) => wallet.id);

  await prisma.refresh_tokens.deleteMany({ where: { user_id: userId } });
  await prisma.spending_budgets.deleteMany({ where: { user_id: userId } });

  if (walletIds.length > 0) {
    await prisma.transfers.deleteMany({
      where: {
        OR: [
          { from_wallet_id: { in: walletIds } },
          { to_wallet_id: { in: walletIds } },
        ],
      },
    });
    await prisma.transactions.deleteMany({
      where: { wallet_id: { in: walletIds } },
    });
  }

  await prisma.money_allocations.deleteMany({ where: { user_id: userId } });
  await prisma.transaction_templates.deleteMany({ where: { user_id: userId } });
  await prisma.wallets.deleteMany({ where: { user_id: userId } });
  await prisma.categories.deleteMany({ where: { user_id: userId } });
}

async function upsertUser(email: string, fullName: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.users.upsert({
    where: { email },
    update: {
      password_hash: passwordHash,
      full_name: fullName,
      is_active: true,
      deleted_at: null,
      session_version: 0,
    },
    create: {
      email,
      password_hash: passwordHash,
      full_name: fullName,
    },
  });

  await resetUserData(user.id);
  return user;
}

async function seedPrimaryUser() {
  const user = await upsertUser(primaryEmail, 'Playwright Wallet Scope User');
  const [food, travel, leisure] = await Promise.all(
    ['E2E อาหาร', 'E2E เดินทาง', 'E2E พักผ่อน'].map((name, index) =>
      prisma.categories.create({
        data: {
          user_id: user.id,
          name,
          type: transaction_type.expense,
          color: ['#f97316', '#2563eb', '#8b5cf6'][index],
        },
      }),
    ),
  );

  const cash = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E เงินสด',
      wallet_type: wallet_type.normal,
      balance: 5_000,
    },
  });
  const savingsParent = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E เงินเก็บ',
      wallet_type: wallet_type.normal,
      balance: 2_000,
    },
  });
  const savingsChild = await prisma.wallets.create({
    data: {
      user_id: user.id,
      parent_wallet_id: savingsParent.id,
      name: 'E2E เงินสำรอง',
      wallet_type: wallet_type.normal,
      balance: 2_000,
    },
  });
  const investment = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E พอร์ตลงทุน',
      wallet_type: wallet_type.investment,
      balance: 10_000,
    },
  });
  const inactive = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E กระเป๋าปิด',
      wallet_type: wallet_type.normal,
      is_active: false,
      balance: 500,
    },
  });
  const deleted = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E กระเป๋าถูกลบ',
      wallet_type: wallet_type.normal,
      balance: 500,
      deleted_at: new Date('2026-07-01T00:00:00.000Z'),
    },
  });

  await prisma.transactions.createMany({
    data: [
      {
        wallet_id: cash.id,
        category_id: food.id,
        name: 'E2E ค่าอาหารเงินสด',
        type: transaction_type.expense,
        amount: 120,
        transaction_date: reportingDate,
      },
      {
        wallet_id: savingsChild.id,
        category_id: food.id,
        name: 'E2E ค่าอาหารเงินสำรอง',
        type: transaction_type.expense,
        amount: 80,
        transaction_date: reportingDate,
      },
      {
        wallet_id: inactive.id,
        category_id: food.id,
        name: 'E2E รายจ่ายกระเป๋าปิด',
        type: transaction_type.expense,
        amount: 700,
        transaction_date: reportingDate,
      },
      {
        wallet_id: investment.id,
        category_id: travel.id,
        name: 'E2E รายจ่ายลงทุน',
        type: transaction_type.expense,
        amount: 900,
        transaction_date: reportingDate,
      },
      {
        wallet_id: deleted.id,
        category_id: leisure.id,
        name: 'E2E รายจ่ายกระเป๋าถูกลบ',
        type: transaction_type.expense,
        amount: 600,
        transaction_date: reportingDate,
      },
    ],
  });

  const allocation = await prisma.money_allocations.create({
    data: {
      user_id: user.id,
      source_wallet_id: cash.id,
      amount: 50,
      allocation_date: reportingDate,
      note: 'E2E allocation pair that must not count as spending',
    },
  });
  const fromTransaction = await prisma.transactions.create({
    data: {
      wallet_id: cash.id,
      category_id: food.id,
      name: 'E2E allocation transfer expense',
      type: transaction_type.expense,
      amount: 50,
      transaction_date: reportingDate,
    },
  });
  const toTransaction = await prisma.transactions.create({
    data: {
      wallet_id: savingsChild.id,
      category_id: food.id,
      name: 'E2E allocation transfer income',
      type: transaction_type.income,
      amount: 50,
      transaction_date: reportingDate,
    },
  });

  await prisma.transfers.create({
    data: {
      allocation_id: allocation.id,
      from_wallet_id: cash.id,
      to_wallet_id: savingsChild.id,
      from_transaction_id: fromTransaction.id,
      to_transaction_id: toTransaction.id,
      amount: 50,
      transfer_date: reportingDate,
      note: 'E2E allocation transfer pair',
    },
  });

  return { user, cash, savingsChild, food, travel, leisure };
}

async function seedSecondaryUser() {
  const user = await upsertUser(secondaryEmail, 'Playwright Secondary User');
  const category = await prisma.categories.create({
    data: {
      user_id: user.id,
      name: 'E2E หมวดของ User B',
      type: transaction_type.expense,
      color: '#db2777',
    },
  });
  const wallet = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E กระเป๋าของ User B',
      wallet_type: wallet_type.normal,
      balance: 3_000,
    },
  });

  await prisma.transactions.create({
    data: {
      wallet_id: wallet.id,
      category_id: category.id,
      name: 'E2E รายจ่ายของ User B',
      type: transaction_type.expense,
      amount: 999,
      transaction_date: reportingDate,
    },
  });
  await prisma.spending_budgets.create({
    data: {
      user_id: user.id,
      name: 'E2E งบของ User B',
      amount: 1_500,
      period: spending_budget_period.daily,
      wallet_scope: 'all',
      includes_uncategorized: false,
      spending_budget_categories: {
        create: { category_id: category.id },
      },
    },
  });

  return { user, wallet, category };
}

async function seed() {
  const [primary, secondary] = await Promise.all([
    seedPrimaryUser(),
    seedSecondaryUser(),
  ]);

  console.log(
    `Seeded Playwright accounts: ${primary.user.email}, ${secondary.user.email}`,
  );
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
