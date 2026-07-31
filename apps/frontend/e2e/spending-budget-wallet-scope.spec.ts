import { expect, test } from "@playwright/test";
import {
  WALLET_SCOPE_TEXT,
  expectManagedBudget,
  expectWalletScopePayload,
  fillBudgetForm,
  openBudgetCreateForm,
  openBudgetManagement,
  saveNewBudget,
  selectWalletScope,
  selectWallets,
  waitForBudgetMutation,
} from "./spending-budget-wallet-scope.helpers";
import { openDashboard } from "./spending-budget.helpers";

test.describe("Spending Budget wallet scope", () => {
  test("creates an all-wallet budget with an empty wallet list", async ({ page }) => {
    await openDashboard(page);
    const dialog = await openBudgetCreateForm(page);

    await fillBudgetForm(dialog, {
      name: "E2E งบอาหารทุกกระเป๋า",
      category: WALLET_SCOPE_TEXT.food,
    });
    await expect(dialog.getByLabel(WALLET_SCOPE_TEXT.all, { exact: true })).toBeChecked();

    const requestPromise = waitForBudgetMutation(page, "POST");
    await saveNewBudget(dialog);
    const request = await requestPromise;

    expectWalletScopePayload(request, "all", 0);

    const managementDialog = await openBudgetManagement(page);
    await expectManagedBudget(
      managementDialog,
      "E2E งบอาหารทุกกระเป๋า",
      WALLET_SCOPE_TEXT.all,
    );
  });

  test("creates selected-wallet budgets for one and multiple wallets", async ({ page }) => {
    await openDashboard(page);
    const singleDialog = await openBudgetCreateForm(page);

    await fillBudgetForm(singleDialog, {
      name: "E2E งบเดินทางเงินสด",
      category: WALLET_SCOPE_TEXT.travel,
    });
    await selectWalletScope(singleDialog, "selected");
    await selectWallets(singleDialog, [WALLET_SCOPE_TEXT.cash]);

    const singleRequestPromise = waitForBudgetMutation(page, "POST");
    await saveNewBudget(singleDialog);
    expectWalletScopePayload(await singleRequestPromise, "selected", 1);

    const multipleDialog = await openBudgetCreateForm(page);
    await fillBudgetForm(multipleDialog, {
      name: "E2E งบพักผ่อนสองกระเป๋า",
      category: WALLET_SCOPE_TEXT.leisure,
    });
    await selectWalletScope(multipleDialog, "selected");
    await selectWallets(multipleDialog, [
      WALLET_SCOPE_TEXT.cash,
      WALLET_SCOPE_TEXT.savingsChild,
    ]);

    const multipleRequestPromise = waitForBudgetMutation(page, "POST");
    await saveNewBudget(multipleDialog);
    expectWalletScopePayload(await multipleRequestPromise, "selected", 2);

    const managementDialog = await openBudgetManagement(page);
    await expectManagedBudget(
      managementDialog,
      "E2E งบเดินทางเงินสด",
      WALLET_SCOPE_TEXT.cash,
    );
    await expectManagedBudget(
      managementDialog,
      "E2E งบพักผ่อนสองกระเป๋า",
      `${WALLET_SCOPE_TEXT.cash} +1`,
    );
  });

  test("clears selected wallet IDs when the user returns to all wallets", async ({ page }) => {
    await openDashboard(page);
    const dialog = await openBudgetCreateForm(page);

    await fillBudgetForm(dialog, {
      name: "E2E งบเลือกแล้วกลับทุกกระเป๋า",
      category: WALLET_SCOPE_TEXT.food,
      period: "weekly",
    });
    await selectWalletScope(dialog, "selected");
    await selectWallets(dialog, [
      WALLET_SCOPE_TEXT.cash,
      WALLET_SCOPE_TEXT.savingsChild,
    ]);
    await selectWalletScope(dialog, "all");

    const requestPromise = waitForBudgetMutation(page, "POST");
    await saveNewBudget(dialog);

    expectWalletScopePayload(await requestPromise, "all", 0);
  });
});
