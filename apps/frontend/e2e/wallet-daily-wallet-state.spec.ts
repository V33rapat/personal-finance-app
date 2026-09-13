import { expect, test } from "@playwright/test";
import {
  DAILY_PARENT_WITH_CHILD_NAME,
  DAILY_PARENT_WITHOUT_CHILD_NAME,
  openDailyTransactions,
  openDailyWallet,
} from "./wallet-daily.helpers";

test.describe("Daily Transaction View wallet eligibility", () => {
  test("hides the transaction tab for a parent wallet that has an active sub-wallet", async ({ page }) => {
    await openDailyWallet(page, DAILY_PARENT_WITH_CHILD_NAME);

    await expect(
      page.getByRole("button", { name: "รายการ", exact: true }),
    ).toHaveCount(0);
  });

  test("allows a parent wallet without active sub-wallets to open the transaction tab", async ({ page }) => {
    await openDailyTransactions(page, DAILY_PARENT_WITHOUT_CHILD_NAME);

    await expect(page.getByTestId("daily-summary")).toBeVisible();
  });
});
