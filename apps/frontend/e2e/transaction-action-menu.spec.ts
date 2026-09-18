import { expect, test } from "@playwright/test";
import {
  ACTION_MANUAL_EXPENSE,
  getActionMenuItem,
  getTransactionRow,
  openActionMenu,
  openTransactions,
} from "./transaction-action-menu.helpers";

test.describe("Transaction Action Menu", () => {
  test("shows four actions for a manual transaction", async ({ page }) => {
    await openTransactions(page);

    const row = getTransactionRow(page, ACTION_MANUAL_EXPENSE);
    const { menu } = await openActionMenu(row);

    await expect(menu.getByTestId("transaction-action-edit")).toContainText("แก้ไขรายการ");
    await expect(menu.getByTestId("transaction-action-duplicate")).toContainText("ทำสำเนารายการ");
    await expect(menu.getByTestId("transaction-action-template")).toContainText("บันทึกเป็นรายการประจำ");
    await expect(menu.getByTestId("transaction-action-delete")).toContainText("ลบรายการ");
    await expect(menu.getByRole("menuitem")).toHaveCount(4);
  });

  test("closes when pressing Escape or clicking outside", async ({ page }) => {
    await openTransactions(page);

    const row = getTransactionRow(page, ACTION_MANUAL_EXPENSE);
    const { menu, trigger } = await openActionMenu(row);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await openActionMenu(row);
    await page.getByRole("heading", { name: "รายการธุรกรรม", exact: true }).click();
    await expect(row.getByTestId("transaction-action-menu")).toBeHidden();
  });

  test("supports keyboard navigation and returns focus to the trigger", async ({ page }) => {
    await openTransactions(page);

    const row = getTransactionRow(page, ACTION_MANUAL_EXPENSE);
    const trigger = row.getByTestId("transaction-action-menu-trigger");
    await trigger.focus();
    await trigger.press("ArrowDown");

    const menu = row.getByTestId("transaction-action-menu");
    await expect(menu).toBeVisible();
    await expect(getActionMenuItem(row, "edit")).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(getActionMenuItem(row, "duplicate")).toBeFocused();
    await page.keyboard.press("End");
    await expect(getActionMenuItem(row, "delete")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(getActionMenuItem(row, "edit")).toBeFocused();
    await page.keyboard.press("Escape");

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
