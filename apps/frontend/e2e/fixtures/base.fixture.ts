import { test as base } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { ApiHelper } from '../helpers/api.helper';
import { SpendingPlanHelper } from '../helpers/spending-plan.helper';
import { TestUser } from '../helpers/api.helper';

type TestFixtures = {
  authHelper: AuthHelper;
  apiHelper: ApiHelper;
  spendingPlanHelper: SpendingPlanHelper;
  testUser: TestUser;
};

export const test = base.extend<TestFixtures>({
  authHelper: async ({ page }, use) => {
    await use(new AuthHelper(page));
  },

  apiHelper: async ({ request }, use) => {
    const helper = new ApiHelper(request);
    await use(helper);
  },

  spendingPlanHelper: async ({ page }, use) => {
    await use(new SpendingPlanHelper(page));
  },

  testUser: async ({ apiHelper }, use) => {
    const user = await apiHelper.createTestUser();
    await use(user);
    await apiHelper.cleanupTestData(user.id);
  },
});

export { expect } from '@playwright/test';
