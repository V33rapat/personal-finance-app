import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  WALLET_SCOPE_TEXT,
  expectWalletScopePayload,
  fillBudgetForm,
  openBudgetCreateForm,
  saveNewBudget,
  selectWalletScope,
  selectWallets,
  waitForBudgetMutation,
} from "./spending-budget-wallet-scope.helpers";
import { openDashboard } from "./spending-budget.helpers";

interface BudgetScenario {
  name: string;
  category: string;
  walletScope: "all" | "selected";
  wallets?: string[];
}

async function submitBudget(
  page: Page,
  scenario: BudgetScenario,
): Promise<Locator> {
  const dialog = await openBudgetCreateForm(page);
  await fillBudgetForm(dialog, {
    name: scenario.name,
    category: scenario.category,
    period: "yearly",
  });
  await selectWalletScope(dialog, scenario.walletScope);

  if (scenario.walletScope === "selected") {
    await selectWallets(dialog, scenario.wallets ?? []);
  }

  const requestPromise = waitForBudgetMutation(page, "POST");
  await saveNewBudget(dialog);
  expectWalletScopePayload(
    await requestPromise,
    scenario.walletScope,
    scenario.walletScope === "all" ? 0 : scenario.wallets?.length ?? 0,
  );
  return dialog;
}

test.describe("Spending Budget wallet scope errors", () => {
  test("accepts distinct scopes but rejects an exact selected-wallet duplicate", async ({ page }) => {
    await openDashboard(page);

    await submitBudget(page, {
      name: "E2E งบอาหารทุกกระเป๋ารายปี",
      category: WALLET_SCOPE_TEXT.food,
      walletScope: "all",
    });
    await submitBudget(page, {
      name: "E2E งบอาหารเลือกสองกระเป๋า",
      category: WALLET_SCOPE_TEXT.food,
      walletScope: "selected",
      wallets: [WALLET_SCOPE_TEXT.cash, WALLET_SCOPE_TEXT.savingsChild],
    });

    const duplicateDialog = await openBudgetCreateForm(page);
    await fillBudgetForm(duplicateDialog, {
      name: "E2E งบอาหารเลือกสองกระเป๋าซ้ำ",
      category: WALLET_SCOPE_TEXT.food,
      period: "yearly",
    });
    await selectWalletScope(duplicateDialog, "selected");
    await selectWallets(duplicateDialog, [
      WALLET_SCOPE_TEXT.savingsChild,
      WALLET_SCOPE_TEXT.cash,
    ]);

    const duplicateRequestPromise = waitForBudgetMutation(page, "POST");
    await saveNewBudget(duplicateDialog);
    expectWalletScopePayload(await duplicateRequestPromise, "selected", 2);
    await expect(duplicateDialog.getByRole("alert")).toBeVisible();
    await expect(duplicateDialog).toBeVisible();
  });

  test("allows selected scopes that overlap only in some wallets", async ({ page }) => {
    await openDashboard(page);

    await submitBudget(page, {
      name: "E2E งบเดินทางสองกระเป๋า",
      category: WALLET_SCOPE_TEXT.travel,
      walletScope: "selected",
      wallets: [WALLET_SCOPE_TEXT.cash, WALLET_SCOPE_TEXT.savingsChild],
    });
    const partialDialog = await submitBudget(page, {
      name: "E2E งบเดินทางกระเป๋าเดียว",
      category: WALLET_SCOPE_TEXT.travel,
      walletScope: "selected",
      wallets: [WALLET_SCOPE_TEXT.cash],
    });

    await expect(partialDialog).toBeHidden();
  });

  test("prevents a double submit while budget saving is in progress", async ({ page }) => {
    await openDashboard(page);
    const dialog = await openBudgetCreateForm(page);
    await fillBudgetForm(dialog, {
      name: "E2E งบกันบันทึกซ้ำ",
      category: WALLET_SCOPE_TEXT.leisure,
      period: "yearly",
    });

    let requestCount = 0;
    await page.route("**/api/spending-budget", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      requestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "e2e-double-submit-budget",
          name: "E2E งบกันบันทึกซ้ำ",
          amount: "1000",
          period: "yearly",
          wallet_scope: "all",
          wallets: [],
          unavailable_wallet_count: 0,
          includes_uncategorized: false,
          is_active: true,
          created_at: "2026-07-20T00:00:00.000Z",
          updated_at: "2026-07-20T00:00:00.000Z",
          categories: [],
        }),
      });
    });

    const saveButton = dialog.getByRole("button", {
      name: "บันทึกงบใช้จ่าย",
      exact: true,
    });
    await saveButton.click();
    await expect(saveButton).toBeDisabled();
    await saveButton.click({ force: true });
    await page.waitForTimeout(400);

    expect(requestCount).toBe(1);
    await page.unroute("**/api/spending-budget");
  });
});
