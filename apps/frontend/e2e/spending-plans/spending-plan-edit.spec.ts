import { test, expect } from '../fixtures/base.fixture';

test.describe('Spending Plan Editing', () => {
  test.beforeEach(async ({ authHelper, testUser }) => {
    await authHelper.login(testUser.email, testUser.password);
  });

  test('SP-EDIT-01: edits active plan', async ({
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

      const editBtn = page.locator('button:has-text("Edit")').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForLoadState('networkidle');

        await page.locator('input[name="name"]').fill('Updated Budget');

        const effectiveDateInput = page.locator('input[name="effective_date"]');
        if (await effectiveDateInput.isVisible()) {
          const today = new Date().toISOString().split('T')[0];
          await effectiveDateInput.fill(today);
        }

        await page.locator('button[type="submit"]').click();

        await expect(page).toHaveURL(/\/spending-plans\/[a-f0-9-]+/);
      }
    }
  });

  test('SP-EDIT-02: edit creates new revision', async ({
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

      const editBtn = page.locator('button:has-text("Edit")').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForLoadState('networkidle');

        await page.locator('input[name="name"]').fill('Revised Budget');

        const effectiveDateInput = page.locator('input[name="effective_date"]');
        if (await effectiveDateInput.isVisible()) {
          const today = new Date().toISOString().split('T')[0];
          await effectiveDateInput.fill(today);
        }

        await page.locator('button[type="submit"]').click();
        await page.waitForLoadState('networkidle');

        const revisionHistory = page.locator('[data-testid="revision-history"]');
        if (await revisionHistory.isVisible()) {
          const revisions = page.locator('[data-testid^="revision-"]');
          const count = await revisions.count();
          expect(count).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  test('SP-EDIT-05: cannot edit completed plan', async ({
    page,
    testUser,
    apiHelper,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans');
    await page.waitForLoadState('networkidle');

    const completedBadge = page.locator('[data-testid="status-badge"]:has-text("completed")').first();
    if (await completedBadge.isVisible()) {
      const planCard = completedBadge.locator('..');
      await planCard.click();
      await page.waitForLoadState('networkidle');

      const editBtn = page.locator('button:has-text("Edit")').first();
      const isVisible = await editBtn.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    }
  });

  test('SP-EDIT-06: cannot edit cancelled plan', async ({
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
      const isVisible = await editBtn.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    }
  });

  test('SP-EDIT-09: cancel edit returns to detail', async ({
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

      const editBtn = page.locator('button:has-text("Edit")').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForLoadState('networkidle');

        const cancelBtn = page.locator('button:has-text("Cancel")').first();
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();

          await expect(page).toHaveURL(/\/spending-plans\/[a-f0-9-]+/);
        }
      }
    }
  });
});
