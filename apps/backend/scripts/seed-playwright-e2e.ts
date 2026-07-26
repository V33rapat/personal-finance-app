import '../src/config/load-env';
import { PrismaClient, spending_budget_period } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const email = process.env.PLAYWRIGHT_E2E_EMAIL ?? 'playwright-e2e@walpaca.test';
const password = process.env.PLAYWRIGHT_E2E_PASSWORD ?? 'PlaywrightE2E!123';

async function seed() {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.users.upsert({
    where: { email },
    update: {
      password_hash: passwordHash,
      full_name: 'Playwright E2E User',
      is_active: true,
      deleted_at: null,
      session_version: 0,
    },
    create: {
      email,
      password_hash: passwordHash,
      full_name: 'Playwright E2E User',
    },
  });

  await prisma.refresh_tokens.deleteMany({ where: { user_id: user.id } });
  await prisma.spending_budgets.deleteMany({ where: { user_id: user.id } });
  await prisma.spending_budgets.createMany({
    data: [
      spending_budget_period.daily,
      spending_budget_period.weekly,
      spending_budget_period.monthly,
      spending_budget_period.yearly,
    ].map((period) => ({
      user_id: user.id,
      name: `Playwright ${period} budget`,
      amount: 1000,
      period,
      includes_uncategorized: true,
      is_active: true,
    })),
  });

  console.log(`Seeded Playwright E2E account: ${email}`);
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
