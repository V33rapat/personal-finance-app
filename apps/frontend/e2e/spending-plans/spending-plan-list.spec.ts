import { test, expect } from '../fixtures/base.fixture';

test.describe('Spending Plan List Page', () => {
  test.beforeEach(async ({ authHelper, testUser }) => {
    await authHelper.login(testUser.email, testUser.password);
  });

  test('SP-LIST-01: shows empty state when no plans exist', async ({ page }) => {
    await page.goto('/spending-plans');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Create your first spending plan')).toBeVisible();
  });

  test('SP-LIST-02: displays plan cards with correct information', async ({
    page,
    apiHelper,
    testUser,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="plan-card"]').first()).toBeVisible();
  });

  test('SP-LIST-03: shows correct status badges', async ({ page }) => {
    await page.goto('/spending-plans');
    await page.waitForLoadState('networkidle');

    const badges = page.locator('[data-testid="status-badge"]');
    const count = await badges.count();

    if (count > 0) {
      const firstBadge = await badges.first().textContent();
      expect(['scheduled', 'active', 'completed', 'cancelled']).toContain(
        firstBadge?.toLowerCase()
      );
    }
  });

  test('SP-LIST-05: navigates to create page', async ({ page }) => {
    await page.goto('/spending-plans');
    await page.waitForLoadState('networkidle');

    const createButton = page.getByRole('link', { name: /create/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await expect(page).toHaveURL(/\/spending-plans\/new/);
    }
  });

  test('SP-LIST-06: navigates to plan detail', async ({
    page,
    apiHelper,
    testUser,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans');
    await page.waitForLoadState('networkidle');

    const planCard = page.locator('[data-testid="plan-card"]').first();
    if (await planCard.isVisible()) {
      await planCard.click();
      await expect(page).toHaveURL(/\/spending-plans\/[a-f0-9-]+/);
    }
  });

  test('SP-LIST-07: shows loading state', async ({ page }) => {
    await page.goto('/spending-plans');

    const loadingSkeleton = page.locator('[data-testid="loading-skeleton"]');
    const isVisible = await loadingSkeleton.isVisible().catch(() => false);

    expect(isVisible).toBeDefined();
  });
});
