import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.configuration';
import { JwtTokenService } from '../src/auth/jwt.service';
import { PrismaService } from '../src/prisma/prisma.service';

export interface E2eContext {
  app: INestApplication<App>;
  prisma: PrismaService;
  jwtTokenService: JwtTokenService;
}

export interface E2eUser {
  id: string;
  email: string;
  fullName: string;
  accessToken: string;
}

export async function createE2eContext(): Promise<E2eContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    jwtTokenService: app.get(JwtTokenService),
  };
}

export async function createE2eUser(
  context: E2eContext,
  fullName: string,
): Promise<E2eUser> {
  const email = `e2e-${randomUUID()}@walpaca.test`;
  const user = await context.prisma.users.create({
    data: {
      email,
      full_name: fullName,
      password_hash: 'test-only-password-hash',
    },
  });
  const { accessToken } = await context.jwtTokenService.generateTokens(
    user.id,
    user.email,
    user.session_version,
  );

  return { id: user.id, email: user.email, fullName, accessToken };
}

export function bearerToken(user: E2eUser) {
  return `Bearer ${user.accessToken}`;
}

export async function cleanupE2eUsers(
  prisma: PrismaService,
  userIds: string[],
) {
  const wallets = await prisma.wallets.findMany({
    where: { user_id: { in: userIds } },
    select: { id: true },
  });
  const walletIds = wallets.map((wallet) => wallet.id);

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

  await prisma.money_allocations.deleteMany({
    where: { user_id: { in: userIds } },
  });
  await prisma.transaction_templates.deleteMany({
    where: { user_id: { in: userIds } },
  });
  await prisma.spending_budgets.deleteMany({
    where: { user_id: { in: userIds } },
  });
  await prisma.dashboard_hidden_categories.deleteMany({
    where: { user_id: { in: userIds } },
  });
  await prisma.dashboard_preferences.deleteMany({
    where: { user_id: { in: userIds } },
  });
  await prisma.refresh_tokens.deleteMany({
    where: { user_id: { in: userIds } },
  });
  await prisma.categories.deleteMany({
    where: { user_id: { in: userIds } },
  });
  await prisma.wallets.deleteMany({
    where: { user_id: { in: userIds } },
  });
  await prisma.users.deleteMany({
    where: { id: { in: userIds } },
  });
}
