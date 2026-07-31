import { expect, test } from "@playwright/test";
import {
  getWalletSummaryCard,
  openDashboardWalletSummary,
} from "./dashboard-wallet-summary.helpers";

test.describe("Dashboard Wallet Summary User B isolation", () => {
  test("shows only User B wallet summaries", async ({ page }) => {
    const summary = await openDashboardWalletSummary(page);

    await expect(
      getWalletSummaryCard(summary, "E2E กระเป๋าของ User B"),
    ).toBeVisible();
    await expect(getWalletSummaryCard(summary, "E2E เงินสด")).toHaveCount(0);
    await expect(
      summary.getByText("E2E Summary Beta", { exact: false }),
    ).toHaveCount(0);
  });
});
