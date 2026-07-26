import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.configuration';
import { JwtTokenService } from './../src/auth/jwt.service';
import { PrismaService } from './../src/prisma/prisma.service';

interface SpendingBudgetOverviewResponse {
  period: string;
  period_start: string;
  period_end: string;
  budgets: Array<{ id: string; name: string }>;
}

describe('SpendingBudgetController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const user = await prisma.users.create({
      data: {
        email: 'spending-budget-e2e@example.com',
        password_hash: 'not-used-by-this-test',
        full_name: 'Spending Budget E2E',
      },
    });
    userId = user.id;

    await prisma.spending_budgets.createMany({
      data: [
        {
          user_id: userId,
          name: 'Daily Budget',
          amount: 180,
          period: 'daily',
          includes_uncategorized: true,
        },
        {
          user_id: userId,
          name: 'Weekly Budget',
          amount: 1_200,
          period: 'weekly',
          includes_uncategorized: true,
        },
        {
          user_id: userId,
          name: 'Monthly Budget',
          amount: 5_000,
          period: 'monthly',
          includes_uncategorized: true,
        },
        {
          user_id: userId,
          name: 'Yearly Budget',
          amount: 60_000,
          period: 'yearly',
          includes_uncategorized: true,
        },
      ],
    });

    const jwtTokenService = app.get(JwtTokenService);
    accessToken = (
      await jwtTokenService.generateTokens(
        user.id,
        user.email,
        user.session_version,
      )
    ).accessToken;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.users.delete({ where: { id: userId } });
    }

    await app.close();
  });

  it('returns a daily overview for a selected date', async () => {
    const response = await request(app.getHttpServer())
      .get('/spending-budget/overview?period=daily&date=2026-07-20')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as SpendingBudgetOverviewResponse;

    expect(body).toMatchObject({
      period: 'daily',
      period_start: '2026-07-20',
      period_end: '2026-07-20',
    });
    expect(body.budgets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Daily Budget' }),
      ]),
    );
  });

  it('returns a weekly overview for exactly seven selected days', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/spending-budget/overview?period=weekly&start=2026-07-20&end=2026-07-26',
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as SpendingBudgetOverviewResponse;

    expect(body).toMatchObject({
      period: 'weekly',
      period_start: '2026-07-20',
      period_end: '2026-07-26',
    });
  });

  it.each([
    ['monthly', 'month=2030-02', '2030-02-01', '2030-02-28'],
    ['yearly', 'year=2031', '2031-01-01', '2031-12-31'],
  ])(
    'allows future %s reporting periods',
    async (period, query, expectedStart, expectedEnd) => {
      const response = await request(app.getHttpServer())
        .get(`/spending-budget/overview?period=${period}&${query}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const body = response.body as SpendingBudgetOverviewResponse;

      expect(body).toMatchObject({
        period,
        period_start: expectedStart,
        period_end: expectedEnd,
      });
    },
  );

  it.each([
    ['six days', '2026-07-20', '2026-07-25'],
    ['eight days', '2026-07-20', '2026-07-27'],
  ])('rejects a weekly selection with %s', async (_label, start, end) => {
    await request(app.getHttpServer())
      .get(`/spending-budget/overview?period=weekly&start=${start}&end=${end}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('rejects an invalid date through the global validation pipe', async () => {
    await request(app.getHttpServer())
      .get('/spending-budget/overview?period=daily&date=2026/07/20')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });
});
