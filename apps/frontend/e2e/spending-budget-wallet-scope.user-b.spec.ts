import { expect, test } from "@playwright/test";
import {
  expectWalletScopePayload,
  fillBudgetForm,
  getWalletCheckbox,
  openBudgetManagement,
  saveNewBudget,
  selectWalletScope,
  selectWallets,
  waitForBudgetMutation,
} from "./spending-budget-wallet-scope.helpers";
import { openDashboard } from "./spending-budget.helpers";

const USER_B_BUDGET = "E2E งบของ User B";
const USER_B_CATEGORY = "E2E หมวดของ User B";
const USER_B_WALLET = "E2E กระเป๋าของ User B";

test("keeps spending budget wallet scope data isolated for User B", async ({ page }) => {
  await openDashboard(page);
  const managementDialog = await openBudgetManagement(page);

  await expect(managementDialog).toContainText(USER_B_BUDGET);
  await expect(managementDialog).not.toContainText("E2E เงินสด");
  await expect(managementDialog).not.toContainText("E2E งบอาหารทุกกระเป๋า");

  await managementDialog
    .getByRole("button", { name: "สร้างงบใช้จ่าย", exact: true })
    .click();
  const createDialog = page.getByRole("dialog", { name: "สร้างงบใช้จ่าย" });
  await fillBudgetForm(createDialog, {
    name: "E2E งบเลือกกระเป๋าของ User B",
    category: USER_B_CATEGORY,
  });
  await selectWalletScope(createDialog, "selected");
  await expect(getWalletCheckbox(createDialog, USER_B_WALLET)).toBeVisible();
  await expect(getWalletCheckbox(createDialog, "E2E เงินสด")).toHaveCount(0);
  await selectWallets(createDialog, [USER_B_WALLET]);

  const requestPromise = waitForBudgetMutation(page, "POST");
  await saveNewBudget(createDialog);
  expectWalletScopePayload(await requestPromise, "selected", 1);
});
