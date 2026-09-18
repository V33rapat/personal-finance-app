import { expect, test } from "@playwright/test";
import {
  DAILY_DATE,
  getDailyRow,
  openDailyTransactions,
  selectDailyDate,
} from "./wallet-daily.helpers";

test.describe("Managed transaction action states", () => {
  test("keeps transfer and allocation rows read-only with reserved action space", async ({ page }) => {
    await openDailyTransactions(page);
    await selectDailyDate(page, DAILY_DATE);

    const transferRow = getDailyRow(page, "E2E Managed Transfer Expense");
    const allocationRow = getDailyRow(page, "E2E Managed Allocation Expense");
    const manualRow = getDailyRow(page, "E2E Daily Food Expense");

    await expect(transferRow).toHaveAttribute("data-management", "transfer");
    await expect(allocationRow).toHaveAttribute("data-management", "allocation");
    await expect(transferRow).toContainText("จัดการจากการโอนเงิน");
    await expect(allocationRow).toContainText("จัดการจากการจัดสรรเงิน");
    await expect(transferRow.getByTestId("transaction-action-menu-trigger")).toHaveCount(0);
    await expect(allocationRow.getByTestId("transaction-action-menu-trigger")).toHaveCount(0);
    await expect(transferRow.getByTestId("transaction-action-menu-placeholder")).toHaveCount(1);
    await expect(allocationRow.getByTestId("transaction-action-menu-placeholder")).toHaveCount(1);
    await expect(transferRow.getByRole("button")).toHaveCount(0);
    await expect(allocationRow.getByRole("button")).toHaveCount(0);
    await expect(manualRow.getByTestId("transaction-action-menu-trigger")).toBeVisible();

    const manualActionBox = await manualRow
      .getByTestId("transaction-action-menu-trigger")
      .boundingBox();
    const transferPlaceholderBox = await transferRow
      .getByTestId("transaction-action-menu-placeholder")
      .boundingBox();
    expect(manualActionBox).not.toBeNull();
    expect(transferPlaceholderBox).not.toBeNull();
    expect(Math.abs(manualActionBox!.x - transferPlaceholderBox!.x)).toBeLessThan(2);
  });
});

