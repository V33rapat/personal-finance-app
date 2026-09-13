import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  E2eContext,
  E2eUser,
  bearerToken,
  cleanupE2eUsers,
  createE2eContext,
  createE2eUser,
} from './e2e-test-utils';

interface IdResponse {
  id: string;
}

interface ProfileResponse {
  fullName: string;
  email: string;
}

interface DashboardPreferencesResponse {
  is_category_breakdown_enabled: boolean;
}

interface DashboardSummaryResponse {
  total_balance: string;
  active_wallet_count: number;
}

interface UserAResources {
  walletId: string;
  transactionId: string;
  transferId: string;
  allocationId: string;
  categoryId: string;
  templateId: string;
  budgetId: string;
}

const reportingDate = new Date().toISOString().slice(0, 10);

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function expectCollectionNotToContainId(value: unknown, id: string) {
  const records = value as IdResponse[];
  expect(records.some((record) => record.id === id)).toBe(false);
}

describe('Resource authorization boundaries (e2e)', () => {
  let context: E2eContext;
  let app: INestApplication<App>;
  let userA: E2eUser;
  let userB: E2eUser;
  let resources: UserAResources;

  beforeAll(async () => {
    context = await createE2eContext();
    app = context.app;
    userA = await createE2eUser(context, 'Authorization User A');
    userB = await createE2eUser(context, 'Authorization User B');

    const sourceWalletResponse = await request(app.getHttpServer())
      .post('/wallet')
      .set('Authorization', bearerToken(userA))
      .send({ name: 'User A source wallet' })
      .expect(201);
    const sourceWallet = sourceWalletResponse.body as IdResponse;

    const destinationWalletResponse = await request(app.getHttpServer())
      .post('/wallet')
      .set('Authorization', bearerToken(userA))
      .send({ name: 'User A destination wallet' })
      .expect(201);
    const destinationWallet = destinationWalletResponse.body as IdResponse;

    const categoryResponse = await request(app.getHttpServer())
      .post('/category')
      .set('Authorization', bearerToken(userA))
      .send({
        name: 'User A private category',
        type: 'expense',
        color: '#2563eb',
      })
      .expect(201);
    const category = categoryResponse.body as IdResponse;

    const templateResponse = await request(app.getHttpServer())
      .post('/transaction-template')
      .set('Authorization', bearerToken(userA))
      .send({
        name: 'User A private template',
        type: 'expense',
        default_amount: 25,
        category_id: category.id,
      })
      .expect(201);
    const template = templateResponse.body as IdResponse;

    const transactionResponse = await request(app.getHttpServer())
      .post('/transaction')
      .set('Authorization', bearerToken(userA))
      .send({
        wallet_id: sourceWallet.id,
        name: 'User A private expense',
        amount: 10,
        type: 'expense',
        category_id: category.id,
        transaction_date: reportingDate,
      })
      .expect(201);
    const transaction = transactionResponse.body as IdResponse;

    await request(app.getHttpServer())
      .post('/transaction')
      .set('Authorization', bearerToken(userA))
      .send({
        wallet_id: sourceWallet.id,
        name: 'User A funding income',
        amount: 500,
        type: 'income',
        transaction_date: reportingDate,
      })
      .expect(201);

    const transferResponse = await request(app.getHttpServer())
      .post('/transfer')
      .set('Authorization', bearerToken(userA))
      .send({
        from_wallet_id: sourceWallet.id,
        to_wallet_id: destinationWallet.id,
        amount: 50,
        transfer_date: reportingDate,
      })
      .expect(201);
    const transfer = transferResponse.body as IdResponse;

    const allocationResponse = await request(app.getHttpServer())
      .post('/allocation')
      .set('Authorization', bearerToken(userA))
      .send({
        source_wallet_id: sourceWallet.id,
        amount: 40,
        allocation_date: reportingDate,
        destinations: [{ wallet_id: destinationWallet.id, amount: 40 }],
      })
      .expect(201);
    const allocation = allocationResponse.body as IdResponse;

    const budgetResponse = await request(app.getHttpServer())
      .post('/spending-budget')
      .set('Authorization', bearerToken(userA))
      .send({
        name: 'User A private budget',
        amount: 1_000,
        period: 'daily',
        wallet_scope: 'all',
        wallet_ids: [],
        category_ids: [category.id],
        includes_uncategorized: false,
      })
      .expect(201);
    const budget = budgetResponse.body as IdResponse;

    resources = {
      walletId: sourceWallet.id,
      transactionId: transaction.id,
      transferId: transfer.id,
      allocationId: allocation.id,
      categoryId: category.id,
      templateId: template.id,
      budgetId: budget.id,
    };
  });

  afterAll(async () => {
    await cleanupE2eUsers(context.prisma, [userA.id, userB.id]);
    await app.close();
  });

  it('returns only the authenticated user profile, lists, dashboard data, and preferences', async () => {
    const profileResponse = await request(app.getHttpServer())
      .post('/auth/profile')
      .set('Authorization', bearerToken(userB))
      .expect(200);
    expect(profileResponse.body as ProfileResponse).toMatchObject({
      fullName: userB.fullName,
      email: userB.email,
    });

    const walletResponse = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', bearerToken(userB))
      .expect(200);
    expectCollectionNotToContainId(walletResponse.body, resources.walletId);

    const transactionResponse = await request(app.getHttpServer())
      .get('/transaction')
      .set('Authorization', bearerToken(userB))
      .expect(200);
    expectCollectionNotToContainId(
      transactionResponse.body,
      resources.transactionId,
    );

    const transferResponse = await request(app.getHttpServer())
      .get('/transfer')
      .set('Authorization', bearerToken(userB))
      .expect(200);
    expectCollectionNotToContainId(transferResponse.body, resources.transferId);

    const allocationResponse = await request(app.getHttpServer())
      .get('/allocation')
      .set('Authorization', bearerToken(userB))
      .expect(200);
    expectCollectionNotToContainId(
      allocationResponse.body,
      resources.allocationId,
    );

    const categoryResponse = await request(app.getHttpServer())
      .get('/category')
      .set('Authorization', bearerToken(userB))
      .expect(200);
    expectCollectionNotToContainId(categoryResponse.body, resources.categoryId);

    const templateResponse = await request(app.getHttpServer())
      .get('/transaction-template')
      .set('Authorization', bearerToken(userB))
      .expect(200);
    expectCollectionNotToContainId(templateResponse.body, resources.templateId);

    const budgetResponse = await request(app.getHttpServer())
      .get('/spending-budget')
      .set('Authorization', bearerToken(userB))
      .expect(200);
    expectCollectionNotToContainId(budgetResponse.body, resources.budgetId);

    const overviewResponse = await request(app.getHttpServer())
      .get(`/spending-budget/overview?period=daily&date=${reportingDate}`)
      .set('Authorization', bearerToken(userB))
      .expect(200);
    expectCollectionNotToContainId(
      (overviewResponse.body as { budgets: IdResponse[] }).budgets,
      resources.budgetId,
    );

    const preferenceStart = dateDaysAgo(2);
    const preferenceEnd = dateDaysAgo(1);
    await request(app.getHttpServer())
      .patch('/dashboard/preferences')
      .set('Authorization', bearerToken(userB))
      .send({
        period_start: preferenceStart,
        period_end: preferenceEnd,
        is_category_breakdown_enabled: true,
        hidden_category_ids: [],
      })
      .expect(200);

    const userAPreferencesResponse = await request(app.getHttpServer())
      .get('/dashboard/preferences')
      .set('Authorization', bearerToken(userA))
      .expect(200);
    expect(
      (userAPreferencesResponse.body as DashboardPreferencesResponse)
        .is_category_breakdown_enabled,
    ).toBe(false);

    const summaryResponse = await request(app.getHttpServer())
      .get('/dashboard/summary')
      .set('Authorization', bearerToken(userB))
      .expect(200);
    expect(summaryResponse.body as DashboardSummaryResponse).toMatchObject({
      total_balance: '0.00',
      active_wallet_count: 0,
    });
  });

  it('rejects User B reads and mutations against User A resources', async () => {
    await request(app.getHttpServer())
      .get(`/wallet/${resources.walletId}`)
      .set('Authorization', bearerToken(userB))
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/wallet/${resources.walletId}`)
      .set('Authorization', bearerToken(userB))
      .send({ name: 'User B wallet attempt' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/wallet/${resources.walletId}`)
      .set('Authorization', bearerToken(userB))
      .expect(404);

    await request(app.getHttpServer())
      .get(`/transaction/${resources.transactionId}`)
      .set('Authorization', bearerToken(userB))
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/transaction/${resources.transactionId}`)
      .set('Authorization', bearerToken(userB))
      .send({ note: 'User B transaction attempt' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/transaction/${resources.transactionId}`)
      .set('Authorization', bearerToken(userB))
      .expect(404);

    await request(app.getHttpServer())
      .get(`/transfer/${resources.transferId}`)
      .set('Authorization', bearerToken(userB))
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/transfer/${resources.transferId}`)
      .set('Authorization', bearerToken(userB))
      .send({ note: 'User B transfer attempt' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/transfer/${resources.transferId}`)
      .set('Authorization', bearerToken(userB))
      .expect(404);

    await request(app.getHttpServer())
      .get(`/allocation/${resources.allocationId}`)
      .set('Authorization', bearerToken(userB))
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/allocation/${resources.allocationId}`)
      .set('Authorization', bearerToken(userB))
      .send({ note: 'User B allocation attempt' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/allocation/${resources.allocationId}`)
      .set('Authorization', bearerToken(userB))
      .expect(404);

    await request(app.getHttpServer())
      .get(`/transaction-template/${resources.templateId}`)
      .set('Authorization', bearerToken(userB))
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/transaction-template/${resources.templateId}`)
      .set('Authorization', bearerToken(userB))
      .send({ name: 'User B template attempt' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/transaction-template/${resources.templateId}`)
      .set('Authorization', bearerToken(userB))
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/spending-budget/${resources.budgetId}`)
      .set('Authorization', bearerToken(userB))
      .send({ name: 'User B budget attempt' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/spending-budget/${resources.budgetId}`)
      .set('Authorization', bearerToken(userB))
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/category/${resources.categoryId}`)
      .set('Authorization', bearerToken(userB))
      .expect(403);

    await request(app.getHttpServer())
      .get(`/wallet/${resources.walletId}`)
      .set('Authorization', bearerToken(userA))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/transaction/${resources.transactionId}`)
      .set('Authorization', bearerToken(userA))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/transfer/${resources.transferId}`)
      .set('Authorization', bearerToken(userA))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/allocation/${resources.allocationId}`)
      .set('Authorization', bearerToken(userA))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/transaction-template/${resources.templateId}`)
      .set('Authorization', bearerToken(userA))
      .expect(200);
  });
});
