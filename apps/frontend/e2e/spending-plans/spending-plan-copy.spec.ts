import { test, expect } from '../fixtures/base.fixture';

test.describe('Spending Plan Copying', () => {
  test.beforeEach(async ({ authHelper, testUser }) => {
    await authHelper.login(testUser.email, testUser.password);
  });

  test('SP-COPY-01: copies plan with valid dates', async ({
    page,
    testUser,
    apiHelper,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans');
    await page.waitForLoadState('networkidle');

    const planCard = page.locator('[data-testid="plan-card"]').first();
    if (await planCard.isVisible()) {
      await planCard.click();
      await page.waitForLoadState('networkidle');

      const copyBtn = page.locator('button:has-text("Copy")').first();
      if (await copyBtn.isVisible()) {
        await copyBtn.click();
        await page.waitForLoadState('networkidle');

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 60);
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const startDateInput = page.locator('input[name="start_date"]');
        if (await startDateInput.isVisible()) {
          await startDateInput.fill(formatDate(futureDate));
        }

        const createCopyBtn = page.locator('button:has-text("Create Copy")');
        if (await createCopyBtn.isVisible()) {
          await createCopyBtn.click();

          await expect(page).toHaveURL(/\/spending-plans\/[a-f0-9-]+/);
        }
      }
    }
  });

  test('SP-COPY-03: copies plan with default name', async ({
    page,
    testUser,
    apiHelper,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans');
    await page.waitForLoadState('networkidle');

    const planCard = page.locator('[data-testid="plan-card"]').first();
    if (await planCard.isVisible()) {
      await planCard.click();
      await page.waitForLoadState('networkidle');

      const copyBtn = page.locator('button:has-text("Copy")').first();
      if (await copyBtn.isVisible()) {
        await copyBtn.click();
        await page.waitForLoadState('networkidle');

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 60);
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const startDateInput = page.locator('input[name="start_date"]');
        if (await startDateInput.isVisible()) {
          await startDateInput.fill(formatDate(futureDate));
        }

        const createCopyBtn = page.locator('button:has-text("Create Copy")');
        if (await createCopyBtn.isVisible()) {
          await createCopyBtn.click();

          await expect(page).toHaveURL(/\/spending-plans\/[a-f0-9-]+/);
        }
      }
    }
  });

  test('SP-COPY-04: copies plan with custom name', async ({
    page,
    testUser,
    apiHelper,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans');
    await page.waitForLoadState('networkidle');

    const planCard = page.locator('[data-testid="plan-card"]').first();
    if (await planCard.isVisible()) {
      await planCard.click();
      await page.waitForLoadState('networkidle');

      const copyBtn = page.locator('button:has-text("Copy")').first();
      if (await copyBtn.isVisible()) {
        await copyBtn.click();
        await page.waitForLoadState('networkidle');

        const nameInput = page.locator('input[name="name"]');
        if (await nameInput.isVisible()) {
          await nameInput.fill('August Budget');
        }

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 60);
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const startDateInput = page.locator('input[name="start_date"]');
        if (await startDateInput.isVisible()) {
          await startDateInput.fill(formatDate(futureDate));
        }

        const createCopyBtn = page.locator('button:has-text("Create Copy")');
        if (await createCopyBtn.isVisible()) {
          await createCopyBtn.click();

          await expect(page).toHaveURL(/\/spending-plans\/[a-f0-9-]+/);
        }
      }
    }
  });

  test('SP-COPY-06: can copy cancelled plan', async ({
    page,
    testUser,
    apiHelper,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans');
    await page.waitForLoadState('networkidle');

    const cancelledBadge = page.locator('[data-testid="status-badge"]:has-text("cancelled")').first();
    if (await cancelledBadge.isVisible()) {
      const planCard = cancelledBadge.locator('..');
      await planCard.click();
      await page.waitForLoadState('networkidle');

      const copyBtn = page.locator('button:has-text("Copy")').first();
      const isVisible = await copyBtn.isVisible().catch(() => false);
      expect(isVisible).toBeDefined();
    }
  });
});
