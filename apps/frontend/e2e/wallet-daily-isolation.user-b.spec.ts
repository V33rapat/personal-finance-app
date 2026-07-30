import { expect, test } from "@playwright/test";
import {
  DAILY_DATE,
  expectSummary,
  getDailyRow,
  openDailyTransactions,
  selectDailyDate,
} from "./wallet-daily.helpers";

const USER_B_WALLET = "E2E กระเป๋าของ User B";
const USER_B_TRANSACTION = "E2E รายจ่ายของ User B";

test("keeps Daily Transaction View records isolated for User B", async ({ page }) => {
  await openDailyTransactions(page, USER_B_WALLET);
  await selectDailyDate(page, DAILY_DATE);

  await expect(getDailyRow(page, USER_B_TRANSACTION)).toBeVisible();
  await expect(page.getByText("E2E Daily Wallet", { exact: true })).toHaveCount(0);
  await expect(getDailyRow(page, "E2E Daily Food Expense")).toHaveCount(0);
  await expectSummary(page, 0, 999);
});
