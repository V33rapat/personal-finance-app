import { expect, test } from "@playwright/test";
import {
  WALLET_SCOPE_TEXT,
  getWalletCheckbox,
  openBudgetCreateForm,
  selectWalletScope,
} from "./spending-budget-wallet-scope.helpers";
import { openDashboard } from "./spending-budget.helpers";

test("keeps Wallet Scope controls usable with keyboard on mobile", async ({ page }) => {
  await openDashboard(page);
  const dialog = await openBudgetCreateForm(page);
  const selectedScope = dialog.getByLabel(WALLET_SCOPE_TEXT.selected, {
    exact: true,
  });

  await selectedScope.focus();
  await page.keyboard.press("Space");
  await expect(selectedScope).toBeChecked();

  const cashCheckbox = getWalletCheckbox(dialog, WALLET_SCOPE_TEXT.cash);
  await cashCheckbox.focus();
  await page.keyboard.press("Space");
  await expect(cashCheckbox).toBeChecked();

  const viewport = page.viewportSize();
  const dialogBox = await dialog.boundingBox();
  const walletBox = await cashCheckbox.boundingBox();

  expect(viewport).not.toBeNull();
  expect(dialogBox).not.toBeNull();
  expect(walletBox).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(walletBox!.x).toBeGreaterThanOrEqual(0);
  expect(walletBox!.x + walletBox!.width).toBeLessThanOrEqual(viewport!.width);

  await selectWalletScope(dialog, "all");
  await expect(cashCheckbox).toHaveCount(0);
});
