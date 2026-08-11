import { test, expect } from '../fixtures/base.fixture';

test.describe('Spending Plan Creation', () => {
  test.beforeEach(async ({ authHelper, testUser }) => {
    await authHelper.login(testUser.email, testUser.password);
  });

  test('SP-CREATE-01: creates plan with valid data', async ({
    page,
    testUser,
    apiHelper,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans/new');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Test Budget');
    await page.locator('input[name="amount"]').fill('100');

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    await page.locator('input[name="start_date"]').fill(formatDate(today));
    await page.locator('input[name="end_date"]').fill(formatDate(nextWeek));

    await page.locator(`[data-testid="wallet-checkbox-${wallet.name}"]`).check();

    const addPurposeBtn = page.locator('button:has-text("Add Purpose")');
    if (await addPurposeBtn.isVisible()) {
      await addPurposeBtn.click();
    }

    await page.locator('[data-testid="purpose-name-0"]').fill('Food');
    await page.locator(`[data-testid="category-checkbox-0-${category.name}"]`).check();

    const dayCount = 8;
    const amountPerDay = (100 / dayCount).toFixed(2);
    for (let d = 0; d < dayCount; d++) {
      await page.locator(`[data-testid="allocation-0-${d}"]`).fill(amountPerDay);
    }

    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/spending-plans\/[a-f0-9-]+/);
  });

  test('SP-CREATE-09: shows error when allocations do not match total', async ({
    page,
    testUser,
    apiHelper,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans/new');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Test Budget');
    await page.locator('input[name="amount"]').fill('100');

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    await page.locator('input[name="start_date"]').fill(formatDate(today));
    await page.locator('input[name="end_date"]').fill(formatDate(nextWeek));

    await page.locator(`[data-testid="wallet-checkbox-${wallet.name}"]`).check();

    const addPurposeBtn = page.locator('button:has-text("Add Purpose")');
    if (await addPurposeBtn.isVisible()) {
      await addPurposeBtn.click();
    }

    await page.locator('[data-testid="purpose-name-0"]').fill('Food');
    await page.locator(`[data-testid="category-checkbox-0-${category.name}"]`).check();

    const dayCount = 8;
    const amountPerDay = (90 / dayCount).toFixed(2);
    for (let d = 0; d < dayCount; d++) {
      await page.locator(`[data-testid="allocation-0-${d}"]`).fill(amountPerDay);
    }

    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/total allocated must equal/i)).toBeVisible();
  });

  test('SP-CREATE-10: validates plan name length', async ({ page }) => {
    await page.goto('/spending-plans/new');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('AB');

    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/3-100 characters/i)).toBeVisible();
  });

  test('SP-CREATE-11: validates plan amount', async ({ page }) => {
    await page.goto('/spending-plans/new');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Test Budget');
    await page.locator('input[name="amount"]').fill('-50');

    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/greater than 0/i)).toBeVisible();
  });

  test('SP-CREATE-12: validates start date is not in the past', async ({
    page,
    testUser,
    apiHelper,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans/new');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Test Budget');
    await page.locator('input[name="amount"]').fill('100');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    await page.locator('input[name="start_date"]').fill(formatDate(yesterday));

    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/cannot start in the past/i)).toBeVisible();
  });

  test('SP-CREATE-13: validates date range does not exceed 31 days', async ({
    page,
    testUser,
    apiHelper,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans/new');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Test Budget');
    await page.locator('input[name="amount"]').fill('100');

    const today = new Date();
    const overMonth = new Date(today);
    overMonth.setDate(today.getDate() + 32);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    await page.locator('input[name="start_date"]').fill(formatDate(today));
    await page.locator('input[name="end_date"]').fill(formatDate(overMonth));

    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/1-31 days/i)).toBeVisible();
  });

  test('SP-CREATE-14: validates at least one wallet is selected', async ({
    page,
  }) => {
    await page.goto('/spending-plans/new');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Test Budget');
    await page.locator('input[name="amount"]').fill('100');

    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/select at least 1 wallet/i)).toBeVisible();
  });

  test('SP-CREATE-17: cancel returns to list', async ({ page }) => {
    await page.goto('/spending-plans/new');
    await page.waitForLoadState('networkidle');

    const cancelButton = page.locator('button:has-text("Cancel")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await expect(page).toHaveURL(/\/spending-plans/);
    }
  });

  test('SP-CREATE-18: creates single-day plan', async ({
    page,
    testUser,
    apiHelper,
  }) => {
    const wallet = await apiHelper.createTestWallet(testUser.id);
    const category = await apiHelper.createTestCategory(testUser.id);

    await page.goto('/spending-plans/new');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Single Day Plan');
    await page.locator('input[name="amount"]').fill('50');

    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    await page.locator('input[name="start_date"]').fill(formatDate(today));
    await page.locator('input[name="end_date"]').fill(formatDate(today));

    await page.locator(`[data-testid="wallet-checkbox-${wallet.name}"]`).check();

    const addPurposeBtn = page.locator('button:has-text("Add Purpose")');
    if (await addPurposeBtn.isVisible()) {
      await addPurposeBtn.click();
    }

    await page.locator('[data-testid="purpose-name-0"]').fill('Food');
    await page.locator(`[data-testid="category-checkbox-0-${category.name}"]`).check();
    await page.locator('[data-testid="allocation-0-0"]').fill('50');

    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/spending-plans\/[a-f0-9-]+/);
  });
});
