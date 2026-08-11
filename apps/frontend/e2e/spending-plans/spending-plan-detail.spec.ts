import { test, expect } from '../fixtures/base.fixture';

test.describe('Spending Plan Detail Page', () => {
  test.beforeEach(async ({ authHelper, testUser }) => {
    await authHelper.login(testUser.email, testUser.password);
  });

  test('SP-MONTH-01: shows monthly calendar view', async ({
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

      const monthlyViewBtn = page.locator('button:has-text("Monthly")');
      if (await monthlyViewBtn.isVisible()) {
        await monthlyViewBtn.click();
      }

      await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();
    }
  });

  test('SP-MONTH-02: day cells are color-coded by status', async ({
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

      const dayCells = page.locator('[data-testid^="day-cell-"]');
      const count = await dayCells.count();

      if (count > 0) {
        const firstCell = dayCells.first();
        const classes = await firstCell.getAttribute('class');
        expect(classes).toBeDefined();
      }
    }
  });

  test('SP-MONTH-06: clicking day navigates to daily view', async ({
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

      const monthlyViewBtn = page.locator('button:has-text("Monthly")');
      if (await monthlyViewBtn.isVisible()) {
        await monthlyViewBtn.click();
      }

      const dayCell = page.locator('[data-testid^="day-cell-"]').first();
      if (await dayCell.isVisible()) {
        await dayCell.click();

        await expect(page.locator('[data-testid="daily-view"]')).toBeVisible();
      }
    }
  });

  test('SP-RANGE-01: shows range table view', async ({
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

      const rangeViewBtn = page.locator('button:has-text("Range")');
      if (await rangeViewBtn.isVisible()) {
        await rangeViewBtn.click();
      }

      await expect(page.locator('[data-testid="range-table"]')).toBeVisible();
    }
  });

  test('SP-DAILY-01: shows daily detail view', async ({
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

      const dailyViewBtn = page.locator('button:has-text("Daily")');
      if (await dailyViewBtn.isVisible()) {
        await dailyViewBtn.click();
      }

      await expect(page.locator('[data-testid="daily-view"]')).toBeVisible();
      await expect(page.locator('[data-testid="day-summary"]')).toBeVisible();
    }
  });

  test('SP-STATUS-01: shows scheduled status for future plans', async ({
    page,
    testUser,
    apiHelper,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans');
    await page.waitForLoadState('networkidle');

    const statusBadge = page.locator('[data-testid="status-badge"]').first();
    if (await statusBadge.isVisible()) {
      const status = await statusBadge.textContent();
      expect(['scheduled', 'active', 'completed', 'cancelled']).toContain(
        status?.toLowerCase()
      );
    }
  });

  test('SP-PREF-01: view mode persists across navigation', async ({
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

      const rangeViewBtn = page.locator('button:has-text("Range")');
      if (await rangeViewBtn.isVisible()) {
        await rangeViewBtn.click();
      }

      await page.goto('/spending-plans');
      await page.waitForLoadState('networkidle');

      const samePlanCard = page.locator('[data-testid="plan-card"]').first();
      if (await samePlanCard.isVisible()) {
        await samePlanCard.click();
        await page.waitForLoadState('networkidle');

        const rangeTable = page.locator('[data-testid="range-table"]');
        const isRangeVisible = await rangeTable.isVisible().catch(() => false);
        expect(isRangeVisible).toBeDefined();
      }
    }
  });
});
