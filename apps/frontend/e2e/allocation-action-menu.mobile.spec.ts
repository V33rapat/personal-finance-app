import { expect, test } from "@playwright/test";
import {
  cleanupAllocationActionFixtures,
  createAllocationActionFixture,
} from "./allocation-action-menu.helpers";

test("allocation action menu and editor fit on a mobile viewport", async ({ page }) => {
  const marker = `E2E allocation action menu mobile ${Date.now()}`;
  let fixture: Awaited<ReturnType<typeof createAllocationActionFixture>> | null = null;

  try {
    await page.goto("/allocation");
    await expect(page.getByRole("heading", { name: "จัดสรรเงิน", exact: true })).toBeVisible();
    fixture = await createAllocationActionFixture(page, marker);
    await page.reload();

    const row = page
      .getByTestId("allocation-history-row")
      .filter({ hasText: fixture.originalNote });
    await expect(row).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    await row.locator("button[aria-haspopup='menu']").click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    const menuBox = await menu.boundingBox();
    const viewport = page.viewportSize();
    expect(menuBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(menuBox!.x).toBeGreaterThanOrEqual(0);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(viewport!.width);

    await menu.getByRole("menuitem", { name: "แก้ไขการจัดสรรเงิน" }).click();
    const dialog = page.getByRole("dialog", { name: "แก้ไขการจัดสรรเงิน" });
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height);
    await expect(dialog.getByRole("button", { name: "ปิดหน้าต่าง" })).toBeVisible();
    await page.mouse.click(1, 1);
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(row.locator("button[aria-haspopup='menu']")).toBeFocused();
  } finally {
    if (fixture) await cleanupAllocationActionFixtures(page, fixture.marker);
  }
});
