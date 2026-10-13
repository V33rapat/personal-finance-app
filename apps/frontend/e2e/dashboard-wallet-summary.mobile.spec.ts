import { expect, test } from "@playwright/test";
import {
  clearWalletSummarySelection,
  getWalletSummaryCard,
  openDashboardWalletSummary,
  openWalletSummarySettings,
  saveWalletSummarySettings,
  setWalletSummarySelection,
} from "./dashboard-wallet-summary.helpers";

const CASH_WALLET = "E2E เงินสด";
const SAVINGS_CHILD_WALLET = "E2E เงินเก็บ: E2E เงินสำรอง";

test.describe("Dashboard Wallet Summary mobile layout", () => {
  test("keeps cards and settings controls usable inside the mobile viewport", async ({
    page,
  }) => {
    const summary = await openDashboardWalletSummary(page);
    const settings = await openWalletSummarySettings(page);
    await clearWalletSummarySelection(settings);
    await setWalletSummarySelection(settings, [
      CASH_WALLET,
      SAVINGS_CHILD_WALLET,
    ]);
    await saveWalletSummarySettings(settings);

    await expect(getWalletSummaryCard(summary, CASH_WALLET)).toBeVisible();
    await expect(
      getWalletSummaryCard(summary, SAVINGS_CHILD_WALLET),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    const dialog = await openWalletSummarySettings(page);
    const dialogBox = await dialog.boundingBox();
    if (!dialogBox) {
      throw new Error("Wallet summary settings dialog is not visible.");
    }

    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    );

    const checkbox = dialog.getByLabel(CASH_WALLET, { exact: true });
    await checkbox.focus();
    const wasChecked = await checkbox.isChecked();
    await page.keyboard.press("Space");
    await expect(checkbox).toHaveJSProperty("checked", !wasChecked);

    const closeButton = dialog.getByRole("button", {
      name: "ปิด",
      exact: true,
    });
    await closeButton.focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
  });
});
