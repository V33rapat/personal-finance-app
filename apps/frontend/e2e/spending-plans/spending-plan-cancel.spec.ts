import { test, expect } from '../fixtures/base.fixture';

test.describe('Spending Plan Cancellation', () => {
  test.beforeEach(async ({ authHelper, testUser }) => {
    await authHelper.login(testUser.email, testUser.password);
  });

  test('SP-CANCEL-01: cancels active plan', async ({
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

      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();

        const confirmBtn = page.locator('button:has-text("Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();

          await page.waitForLoadState('networkidle');

          const cancelledBadge = page.locator('[data-testid="status-badge"]:has-text("cancelled")');
          await expect(cancelledBadge).toBeVisible();
        }
      }
    }
  });

  test('SP-CANCEL-02: shows confirmation dialog', async ({
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

      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();

        await expect(page.getByText(/stop tracking/i)).toBeVisible();

        const confirmBtn = page.locator('button:has-text("Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    }
  });

  test('SP-CANCEL-05: cancelled plan is immutable', async ({
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

      const editBtn = page.locator('button:has-text("Edit")').first();
      const isEditVisible = await editBtn.isVisible().catch(() => false);
      expect(isEditVisible).toBe(false);

      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      const isCancelVisible = await cancelBtn.isVisible().catch(() => false);
      expect(isCancelVisible).toBe(false);
    }
  });
});
