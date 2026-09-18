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
const defaultSummaryEmail =
  process.env.PLAYWRIGHT_E2E_DEFAULT_SUMMARY_EMAIL ??
  'playwright-dashboard-summary@walpaca.test';
const dailyEmail =
  process.env.PLAYWRIGHT_E2E_DAILY_EMAIL ?? 'playwright-e2e-daily@walpaca.test';
const password = process.env.PLAYWRIGHT_E2E_PASSWORD ?? 'PlaywrightE2E!123';
const reportingDate = new Date('2026-07-20T00:00:00.000Z');
const paginationDate = new Date('2026-07-24T00:00:00.000Z');
const seededWalletCreatedAt = new Date('2026-07-01T00:00:00.000Z');

async function resetUserData(userId: string) {
  const wallets = await prisma.wallets.findMany({
    where: { user_id: userId },
    select: { id: true },
  });
  const walletIds = wallets.map((wallet) => wallet.id);

  await prisma.refresh_tokens.deleteMany({ where: { user_id: userId } });
  await prisma.dashboard_preferences.deleteMany({ where: { user_id: userId } });
  await prisma.dashboard_wallet_summary_preferences.deleteMany({
    where: { user_id: userId },
  });
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
  const [food, travel, leisure, salary] = await Promise.all(
    [
      { name: 'E2E อาหาร', type: transaction_type.expense, color: '#f97316' },
      {
        name: 'E2E เดินทาง',
        type: transaction_type.expense,
        color: '#2563eb',
      },
      {
        name: 'E2E พักผ่อน',
        type: transaction_type.expense,
        color: '#8b5cf6',
      },
      {
        name: 'E2E เงินเดือน',
        type: transaction_type.income,
        color: '#059669',
      },
    ].map(({ name, type, color }) =>
      prisma.categories.create({
        data: {
          user_id: user.id,
          name,
          type,
          color,
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
      created_at: seededWalletCreatedAt,
    },
  });
  const selectionOne = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E Wallet Summary Extra One',
      wallet_type: wallet_type.normal,
      balance: 100,
      created_at: seededWalletCreatedAt,
    },
  });
  const selectionTwo = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E Wallet Summary Extra Two',
      wallet_type: wallet_type.normal,
      balance: 200,
      created_at: seededWalletCreatedAt,
    },
  });
  const savingsParent = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E เงินเก็บ',
      wallet_type: wallet_type.normal,
      balance: 2_000,
      created_at: seededWalletCreatedAt,
    },
  });
  const savingsChild = await prisma.wallets.create({
    data: {
      user_id: user.id,
      parent_wallet_id: savingsParent.id,
      name: 'E2E เงินสำรอง',
      wallet_type: wallet_type.normal,
      balance: 2_000,
      created_at: seededWalletCreatedAt,
    },
  });
  const investment = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E พอร์ตลงทุน',
      wallet_type: wallet_type.investment,
      balance: 10_000,
      created_at: seededWalletCreatedAt,
    },
  });
  const inactive = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E กระเป๋าปิด',
      wallet_type: wallet_type.normal,
      is_active: false,
      balance: 500,
      created_at: seededWalletCreatedAt,
    },
  });
  const deleted = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E กระเป๋าถูกลบ',
      wallet_type: wallet_type.normal,
      balance: 500,
      deleted_at: new Date('2026-07-01T00:00:00.000Z'),
      created_at: seededWalletCreatedAt,
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
        wallet_id: cash.id,
        category_id: travel.id,
        name: 'E2E ค่าเดินทางเงินสด',
        type: transaction_type.expense,
        amount: 60,
        transaction_date: reportingDate,
      },
      {
        wallet_id: cash.id,
        category_id: salary.id,
        name: 'E2E เงินเดือน',
        type: transaction_type.income,
        amount: 2_000,
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
        transaction_date: new Date('2026-07-18T00:00:00.000Z'),
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

  await prisma.dashboard_preferences.create({
    data: {
      user_id: user.id,
      period_start: new Date('2026-07-19T00:00:00.000Z'),
      period_end: reportingDate,
      is_category_breakdown_enabled: false,
    },
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

  const existingTemplate = await prisma.transaction_templates.create({
    data: {
      user_id: user.id,
      wallet_id: cash.id,
      category_id: food.id,
      name: 'E2E Action Existing Template',
      type: transaction_type.expense,
      default_amount: 45,
      note: 'E2E existing template note',
    },
  });
  await prisma.transaction_templates.create({
    data: {
      user_id: user.id,
      wallet_id: cash.id,
      category_id: food.id,
      name: 'E2E Action Replacement Template',
      type: transaction_type.expense,
      default_amount: 75,
      note: 'E2E replacement template note',
    },
  });

  await prisma.transactions.createMany({
    data: [
      {
        wallet_id: cash.id,
        category_id: food.id,
        template_id: existingTemplate.id,
        name: 'E2E Action Manual Expense',
        type: transaction_type.expense,
        amount: 45,
        note: 'E2E action menu fixture',
        transaction_date: reportingDate,
      },
      {
        wallet_id: cash.id,
        category_id: salary.id,
        name: 'E2E Action Manual Income',
        type: transaction_type.income,
        amount: 500,
        note: 'E2E action income fixture',
        transaction_date: reportingDate,
      },
    ],
  });

  return {
    user,
    cash,
    selectionOne,
    selectionTwo,
    savingsChild,
    food,
    travel,
    leisure,
    salary,
  };
}

async function seedDailyUser() {
  const user = await upsertUser(
    dailyEmail,
    'Playwright Daily Transaction User',
  );
  const [dailyIncome, dailyFood, dailyTravel] = await Promise.all(
    [
      {
        name: 'E2E Daily Income',
        type: transaction_type.income,
        color: '#16a34a',
      },
      {
        name: 'E2E Daily Food',
        type: transaction_type.expense,
        color: '#ea580c',
      },
      {
        name: 'E2E Daily Travel',
        type: transaction_type.expense,
        color: '#0284c7',
      },
    ].map(({ name, type, color }) =>
      prisma.categories.create({
        data: {
          user_id: user.id,
          name,
          type,
          color,
        },
      }),
    ),
  );

  const dailyWallet = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E Daily Wallet',
      wallet_type: wallet_type.normal,
      balance: 5_000,
      created_at: seededWalletCreatedAt,
    },
  });
  const dailyDestination = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E Daily Destination',
      wallet_type: wallet_type.normal,
      balance: 1_000,
      created_at: seededWalletCreatedAt,
    },
  });
  const parentWithActiveChild = await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E Daily Parent With Active Child',
      wallet_type: wallet_type.normal,
      balance: 250,
      created_at: seededWalletCreatedAt,
    },
  });
  await prisma.wallets.create({
    data: {
      user_id: user.id,
      parent_wallet_id: parentWithActiveChild.id,
      name: 'E2E Daily Active Child',
      wallet_type: wallet_type.normal,
      balance: 250,
      created_at: seededWalletCreatedAt,
    },
  });
  await prisma.wallets.create({
    data: {
      user_id: user.id,
      name: 'E2E Parent Without Active Child',
      wallet_type: wallet_type.normal,
      balance: 250,
      created_at: seededWalletCreatedAt,
    },
  });

  await prisma.transactions.createMany({
    data: [
      {
        wallet_id: dailyWallet.id,
        category_id: dailyIncome.id,
        name: 'E2E Daily Income',
        type: transaction_type.income,
        amount: 2_000,
        note: 'E2E daily income note',
        transaction_date: reportingDate,
      },
      {
        wallet_id: dailyWallet.id,
        category_id: dailyFood.id,
        name: 'E2E Daily Food Expense',
        type: transaction_type.expense,
        amount: 200,
        note: 'E2E searchable daily food note',
        transaction_date: reportingDate,
      },
      {
        wallet_id: dailyWallet.id,
        category_id: dailyTravel.id,
        name: 'E2E Daily Travel Expense',
        type: transaction_type.expense,
        amount: 60,
        note: 'E2E searchable daily travel note',
        transaction_date: reportingDate,
      },
      ...Array.from({ length: 52 }, (_, index) => ({
        wallet_id: dailyWallet.id,
        category_id: dailyFood.id,
        name: `E2E Pagination ${String(index + 1).padStart(2, '0')}`,
        type: transaction_type.expense,
        amount: 1,
        note: `E2E pagination fixture ${index + 1}`,
        transaction_date: paginationDate,
        created_at: new Date(Date.UTC(2026, 6, 24, 0, index, 0)),
      })),
    ],
  });

  const dailyTransferFromTransaction = await prisma.transactions.create({
    data: {
      wallet_id: dailyWallet.id,
      category_id: null,
      name: 'E2E Managed Transfer Expense',
      type: transaction_type.expense,
      amount: 300,
      transaction_date: reportingDate,
    },
  });
  const dailyTransferToTransaction = await prisma.transactions.create({
    data: {
      wallet_id: dailyDestination.id,
      category_id: null,
      name: 'E2E Managed Transfer Income',
      type: transaction_type.income,
      amount: 300,
      transaction_date: reportingDate,
    },
  });
  await prisma.transfers.create({
    data: {
      from_wallet_id: dailyWallet.id,
      to_wallet_id: dailyDestination.id,
      from_transaction_id: dailyTransferFromTransaction.id,
      to_transaction_id: dailyTransferToTransaction.id,
      amount: 300,
      transfer_date: reportingDate,
      note: 'E2E managed transfer pair',
    },
  });

  const dailyAllocation = await prisma.money_allocations.create({
    data: {
      user_id: user.id,
      source_wallet_id: dailyWallet.id,
      amount: 50,
      allocation_date: reportingDate,
      note: 'E2E daily allocation pair',
    },
  });
  const dailyAllocationFromTransaction = await prisma.transactions.create({
    data: {
      wallet_id: dailyWallet.id,
      category_id: null,
      name: 'E2E Managed Allocation Expense',
      type: transaction_type.expense,
      amount: 50,
      transaction_date: reportingDate,
    },
  });
  const dailyAllocationToTransaction = await prisma.transactions.create({
    data: {
      wallet_id: dailyDestination.id,
      category_id: null,
      name: 'E2E Managed Allocation Income',
      type: transaction_type.income,
      amount: 50,
      transaction_date: reportingDate,
    },
  });
  await prisma.transfers.create({
    data: {
      allocation_id: dailyAllocation.id,
      from_wallet_id: dailyWallet.id,
      to_wallet_id: dailyDestination.id,
      from_transaction_id: dailyAllocationFromTransaction.id,
      to_transaction_id: dailyAllocationToTransaction.id,
      amount: 50,
      transfer_date: reportingDate,
      note: 'E2E daily allocation transfer pair',
    },
  });

  return { user, dailyWallet, dailyDestination, parentWithActiveChild };
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
      created_at: seededWalletCreatedAt,
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

async function seedDefaultSummaryUser() {
  const user = await upsertUser(
    defaultSummaryEmail,
    'Playwright Dashboard Summary User',
  );
  const [expenseCategory, incomeCategory] = await Promise.all([
    prisma.categories.create({
      data: {
        user_id: user.id,
        name: 'E2E Summary Food',
        type: transaction_type.expense,
        color: '#f97316',
      },
    }),
    prisma.categories.create({
      data: {
        user_id: user.id,
        name: 'E2E Summary Income',
        type: transaction_type.income,
        color: '#059669',
      },
    }),
  ]);
  const walletCreatedAt = new Date('2026-07-01T00:00:00.000Z');
  const [alpha, beta, gamma, delta, archived] = await Promise.all(
    [
      { name: 'E2E Summary Alpha', balance: 780 },
      { name: 'E2E Summary Beta', balance: 1_240 },
      { name: 'E2E Summary Gamma', balance: 1_240 },
      { name: 'E2E Summary Delta', balance: 520 },
      { name: 'E2E Summary Archived', balance: 3_000 },
    ].map(({ name, balance }) =>
      prisma.wallets.create({
        data: {
          user_id: user.id,
          name,
          wallet_type: wallet_type.normal,
          balance,
          created_at: walletCreatedAt,
        },
      }),
    ),
  );

  const walletActivity = [
    { wallet: alpha, balance: 780, createdAt: '2026-07-20T12:00:00.000Z' },
    { wallet: beta, balance: 1_240, createdAt: '2026-07-20T11:00:00.000Z' },
    { wallet: gamma, balance: 1_240, createdAt: '2026-07-20T10:00:00.000Z' },
    { wallet: delta, balance: 520, createdAt: '2026-07-20T09:00:00.000Z' },
    { wallet: archived, balance: 3_000, createdAt: '2026-07-20T08:00:00.000Z' },
  ];

  await prisma.transactions.createMany({
    data: walletActivity.flatMap(({ wallet, balance, createdAt }) => [
      {
        wallet_id: wallet.id,
        category_id: incomeCategory.id,
        name: `E2E opening balance ${wallet.id}`,
        type: transaction_type.income,
        amount: balance + 1,
        transaction_date: reportingDate,
        created_at: new Date('2026-07-19T00:00:00.000Z'),
      },
      {
        wallet_id: wallet.id,
        category_id: expenseCategory.id,
        name: `E2E activity ${wallet.id}`,
        type: transaction_type.expense,
        amount: 1,
        transaction_date: reportingDate,
        created_at: new Date(createdAt),
      },
    ]),
  });

  return {
    user,
    alpha,
    beta,
    gamma,
    delta,
    archived,
    category: expenseCategory,
  };
}

async function seed() {
  const [primary, secondary, daily, defaultSummary] = await Promise.all([
    seedPrimaryUser(),
    seedSecondaryUser(),
    seedDailyUser(),
    seedDefaultSummaryUser(),
  ]);

  console.log(
    `Seeded Playwright accounts: ${primary.user.email}, ${secondary.user.email}, ${daily.user.email}, ${defaultSummary.user.email}`,
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
