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

interface WalletResponse {
  id: string;
  balance: string | number;
}

interface TransactionResponse {
  id: string;
}

interface TransferResponse {
  id: string;
}

interface AllocationResponse {
  id: string;
}

const reportingDate = new Date().toISOString().slice(0, 10);

describe('Financial workflows (e2e)', () => {
  let context: E2eContext;
  let app: INestApplication<App>;
  let user: E2eUser;

  beforeAll(async () => {
    context = await createE2eContext();
    app = context.app;
    user = await createE2eUser(context, 'Financial Workflow User');
  });

  afterAll(async () => {
    await cleanupE2eUsers(context.prisma, [user.id]);
    await app.close();
  });

  async function createWallet(name: string, parentWalletId?: string) {
    const response = await request(app.getHttpServer())
      .post('/wallet')
      .set('Authorization', bearerToken(user))
      .send({ name, ...(parentWalletId && { parentWalletId }) })
      .expect(201);

    return response.body as WalletResponse;
  }

  async function getBalance(walletId: string) {
    const response = await request(app.getHttpServer())
      .get(`/wallet/${walletId}`)
      .set('Authorization', bearerToken(user))
      .expect(200);

    return Number((response.body as WalletResponse).balance);
  }

  async function createIncome(walletId: string, amount: number) {
    const response = await request(app.getHttpServer())
      .post('/transaction')
      .set('Authorization', bearerToken(user))
      .send({
        wallet_id: walletId,
        name: 'E2E income',
        amount,
        type: 'income',
        transaction_date: reportingDate,
      })
      .expect(201);

    return response.body as TransactionResponse;
  }

  it('moves a transaction between wallet trees without duplicating balances', async () => {
    const sourceParent = await createWallet('Source parent');
    const sourceWallet = await createWallet('Source child', sourceParent.id);
    const targetParent = await createWallet('Target parent');
    const targetWallet = await createWallet('Target child', targetParent.id);

    const transaction = await createIncome(sourceWallet.id, 100);
    await expect(getBalance(sourceWallet.id)).resolves.toBe(100);
    await expect(getBalance(sourceParent.id)).resolves.toBe(100);

    await request(app.getHttpServer())
      .patch(`/transaction/${transaction.id}`)
      .set('Authorization', bearerToken(user))
      .send({ wallet_id: targetWallet.id, amount: 150 })
      .expect(200);

    await expect(getBalance(sourceWallet.id)).resolves.toBe(0);
    await expect(getBalance(sourceParent.id)).resolves.toBe(0);
    await expect(getBalance(targetWallet.id)).resolves.toBe(150);
    await expect(getBalance(targetParent.id)).resolves.toBe(150);

    await request(app.getHttpServer())
      .patch(`/transaction/${transaction.id}`)
      .set('Authorization', bearerToken(user))
      .send({ amount: 200 })
      .expect(200);

    await expect(getBalance(targetWallet.id)).resolves.toBe(200);
    await expect(getBalance(targetParent.id)).resolves.toBe(200);
  });

  it('reverses transfer balances after an update and delete', async () => {
    const sourceWallet = await createWallet('Transfer source');
    const destinationWallet = await createWallet('Transfer destination');
    await createIncome(sourceWallet.id, 500);

    const createResponse = await request(app.getHttpServer())
      .post('/transfer')
      .set('Authorization', bearerToken(user))
      .send({
        from_wallet_id: sourceWallet.id,
        to_wallet_id: destinationWallet.id,
        amount: 200,
        transfer_date: reportingDate,
      })
      .expect(201);
    const transfer = createResponse.body as TransferResponse;

    await expect(getBalance(sourceWallet.id)).resolves.toBe(300);
    await expect(getBalance(destinationWallet.id)).resolves.toBe(200);

    await request(app.getHttpServer())
      .patch(`/transfer/${transfer.id}`)
      .set('Authorization', bearerToken(user))
      .send({ amount: 250 })
      .expect(200);

    await expect(getBalance(sourceWallet.id)).resolves.toBe(250);
    await expect(getBalance(destinationWallet.id)).resolves.toBe(250);

    await request(app.getHttpServer())
      .delete(`/transfer/${transfer.id}`)
      .set('Authorization', bearerToken(user))
      .expect(200);

    await expect(getBalance(sourceWallet.id)).resolves.toBe(500);
    await expect(getBalance(destinationWallet.id)).resolves.toBe(0);
  });

  it('creates and reverses allocations while rejected allocations leave balances unchanged', async () => {
    const sourceWallet = await createWallet('Allocation source');
    const firstDestination = await createWallet('Allocation first destination');
    const secondDestination = await createWallet(
      'Allocation second destination',
    );
    await createIncome(sourceWallet.id, 500);

    const createResponse = await request(app.getHttpServer())
      .post('/allocation')
      .set('Authorization', bearerToken(user))
      .send({
        source_wallet_id: sourceWallet.id,
        amount: 300,
        allocation_date: reportingDate,
        destinations: [
          { wallet_id: firstDestination.id, amount: 100 },
          { wallet_id: secondDestination.id, amount: 200 },
        ],
      })
      .expect(201);
    const allocation = createResponse.body as AllocationResponse;

    await expect(getBalance(sourceWallet.id)).resolves.toBe(200);
    await expect(getBalance(firstDestination.id)).resolves.toBe(100);
    await expect(getBalance(secondDestination.id)).resolves.toBe(200);

    await request(app.getHttpServer())
      .delete(`/allocation/${allocation.id}`)
      .set('Authorization', bearerToken(user))
      .expect(200);

    await expect(getBalance(sourceWallet.id)).resolves.toBe(500);
    await expect(getBalance(firstDestination.id)).resolves.toBe(0);
    await expect(getBalance(secondDestination.id)).resolves.toBe(0);

    await request(app.getHttpServer())
      .post('/allocation')
      .set('Authorization', bearerToken(user))
      .send({
        source_wallet_id: sourceWallet.id,
        amount: 600,
        allocation_date: reportingDate,
        destinations: [
          { wallet_id: firstDestination.id, amount: 300 },
          { wallet_id: secondDestination.id, amount: 300 },
        ],
      })
      .expect(400);

    await expect(getBalance(sourceWallet.id)).resolves.toBe(500);
    await expect(getBalance(firstDestination.id)).resolves.toBe(0);
    await expect(getBalance(secondDestination.id)).resolves.toBe(0);
  });
});
