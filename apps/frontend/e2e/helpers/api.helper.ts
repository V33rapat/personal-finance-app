import { APIRequestContext } from '@playwright/test';
import { PrismaClient, wallet_type, user_role } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/personal_finance?schema=public';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

export interface TestUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
}

export interface TestWallet {
  id: string;
  name: string;
  walletType: wallet_type;
}

export interface TestCategory {
  id: string;
  name: string;
}

export class ApiHelper {
  constructor(private request: APIRequestContext) {}

  async createTestUser(): Promise<TestUser> {
    const timestamp = Date.now();
    const email = `e2e-test-${timestamp}@example.com`;
    const password = 'TestPassword123!';
    const fullName = 'E2E Test User';

    const user = await prisma.users.create({
      data: {
        email,
        password_hash: password,
        full_name: fullName,
        role: user_role.user,
      },
    });

    return {
      id: user.id,
      email,
      password,
      fullName,
    };
  }

  async createTestWallet(userId: string, name = 'Test Wallet'): Promise<TestWallet> {
    const wallet = await prisma.wallets.create({
      data: {
        user_id: userId,
        name,
        wallet_type: wallet_type.normal,
        balance: 10000,
        currency: 'THB',
      },
    });

    return {
      id: wallet.id,
      name: wallet.name,
      walletType: wallet.wallet_type,
    };
  }

  async createTestCategory(userId: string, name?: string, type: 'income' | 'expense' = 'expense'): Promise<TestCategory> {
    const categoryName = name || `Test Category ${Date.now()}`;
    const category = await prisma.categories.create({
      data: {
        user_id: userId,
        name: categoryName,
        category_type: type,
        color: '#10b981',
        icon: 'tag',
      },
    });

    return {
      id: category.id,
      name: category.name,
    };
  }

  async cleanupTestData(userId: string) {
    try {
      await prisma.spending_plan_allocations.deleteMany({
        where: { purpose: { revision: { plan: { user_id: userId } } } },
      });
      await prisma.spending_plan_revision_purpose_categories.deleteMany({
        where: { purpose: { revision: { plan: { user_id: userId } } } },
      });
      await prisma.spending_plan_revision_purposes.deleteMany({
        where: { revision: { plan: { user_id: userId } } },
      });
      await prisma.spending_plan_revision_wallets.deleteMany({
        where: { revision: { plan: { user_id: userId } } },
      });
      await prisma.spending_plan_revisions.deleteMany({
        where: { plan: { user_id: userId } },
      });
      await prisma.spending_plan_view_preferences.deleteMany({
        where: { plan: { user_id: userId } },
      });
      await prisma.spending_plans.deleteMany({
        where: { user_id: userId },
      });
      await prisma.categories.deleteMany({
        where: { user_id: userId },
      });
      await prisma.wallets.deleteMany({
        where: { user_id: userId },
      });
      await prisma.users.delete({
        where: { id: userId },
      });
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  }
}
