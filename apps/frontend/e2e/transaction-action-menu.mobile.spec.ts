import { expect, test } from "@playwright/test";
import { getTransactionModal } from "./transaction-action-menu.helpers";

test.describe("Transaction Action Menu mobile smoke", () => {
  test("keeps the menu and duplicate modal inside the mobile viewport", async ({ page }) => {
    await page.goto("/transactions");
    await expect(page.getByRole("heading", { name: "รายการธุรกรรม", exact: true })).toBeVisible();

    const row = page
      .locator('[data-testid="daily-transaction-row"][data-management="manual"]')
      .first();
    const trigger = row.getByTestId("transaction-action-menu-trigger");
    await expect(trigger).toBeVisible();
    await trigger.click();

    const menu = row.getByTestId("transaction-action-menu");
    const menuBox = await menu.boundingBox();
    const viewport = page.viewportSize();
    expect(menuBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(viewport!.width);

    await menu.getByTestId("transaction-action-duplicate").click();
    const dialog = getTransactionModal(page);
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width);
    await dialog.getByRole("button", { name: "ปิด", exact: true }).click();
    await expect(dialog).toBeHidden();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
