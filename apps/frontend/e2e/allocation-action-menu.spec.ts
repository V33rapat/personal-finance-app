import { expect, test } from "@playwright/test";
import {
  cleanupAllocationActionFixtures,
  createAllocationActionFixture,
  getBangkokDateOffset,
} from "./allocation-action-menu.helpers";

test("edits, duplicates, and deletes an allocation from its action menu", async ({ page }) => {
  const marker = `E2E allocation action menu ${Date.now()}`;
  let fixture: Awaited<ReturnType<typeof createAllocationActionFixture>> | null = null;

  try {
    await page.goto("/allocation");
    await expect(page.getByRole("heading", { name: "จัดสรรเงิน", exact: true })).toBeVisible();
    fixture = await createAllocationActionFixture(page, marker);
    await page.reload();

    const originalRow = page
      .getByTestId("allocation-history-row")
      .filter({ hasText: fixture.originalNote });
    await expect(originalRow).toBeVisible();

    const actionButton = originalRow.locator("button[aria-haspopup='menu']");
    await actionButton.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    const menuItems = menu.getByRole("menuitem");
    await expect(menuItems.nth(0)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menuItems.nth(1)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(actionButton).toBeFocused();

    await actionButton.click();
    await menu.getByRole("menuitem", { name: "แก้ไขการจัดสรรเงิน" }).click();
    const editDialog = page.getByRole("dialog", { name: "แก้ไขการจัดสรรเงิน" });
    await expect(editDialog).toBeVisible();
    await expect(editDialog.locator("#allocation-editor-date")).toHaveValue(
      fixture.allocationDate,
    );
    await expect(editDialog.locator("#allocation-editor-source-wallet")).toHaveValue(
      fixture.sourceWalletId,
    );
    await expect(editDialog.locator("#allocation-editor-destination-0")).toHaveValue(
      fixture.destinationWalletIds[0],
    );
    await expect(editDialog.locator("#allocation-editor-destination-1")).toHaveValue(
      fixture.destinationWalletIds[1],
    );
    await editDialog.locator("#allocation-editor-amount").fill("24");
    await editDialog.locator("#allocation-editor-destination-amount-0").fill("12");
    await editDialog.locator("#allocation-editor-destination-amount-1").fill("12");
    await editDialog.locator("#allocation-editor-note").fill(fixture.editedNote);
    await editDialog.getByRole("button", { name: "บันทึกการแก้ไข" }).click();

    const editConfirmation = page.getByRole("dialog", { name: "ยืนยันการแก้ไข?" });
    await expect(editConfirmation).toBeVisible();
    await editConfirmation.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
    await expect(editDialog).toBeHidden();

    const editedRow = page
      .getByTestId("allocation-history-row")
      .filter({ hasText: fixture.editedNote });
    await expect(editedRow).toBeVisible();
    await editedRow.locator("button[aria-haspopup='menu']").click();
    await page.getByRole("menuitem", { name: "ทำสำเนาการจัดสรรเงิน" }).click();

    const duplicateDialog = page.getByRole("dialog", {
      name: "ทำสำเนาการจัดสรรเงิน",
      exact: true,
    });
    await expect(duplicateDialog).toBeVisible();
    const today = getBangkokDateOffset(0);
    const duplicateDate = duplicateDialog.locator("#allocation-editor-date");
    await expect(duplicateDate).toHaveValue(today);
    await expect(duplicateDate).toHaveAttribute("max", today);
    await expect(duplicateDialog.locator("#allocation-editor-source-wallet")).toHaveValue(
      fixture.sourceWalletId,
    );
    await expect(duplicateDialog.locator("#allocation-editor-amount")).toHaveValue("24");
    await expect(duplicateDialog.locator("#allocation-editor-destination-0")).toHaveValue(
      fixture.destinationWalletIds[0],
    );
    await expect(duplicateDialog.locator("#allocation-editor-destination-1")).toHaveValue(
      fixture.destinationWalletIds[1],
    );
    await duplicateDialog.locator("#allocation-editor-note").fill(fixture.duplicateNote);
    await duplicateDialog.getByRole("button", { name: "สร้างสำเนา" }).click();

    const duplicateConfirmation = page.getByRole("dialog", {
      name: "ยืนยันทำสำเนาการจัดสรรเงิน?",
    });
    await expect(duplicateConfirmation).toBeVisible();
    const createRequest = page.waitForRequest(
      (request) => request.url().includes("/api/allocation") && request.method() === "POST",
    );
    await duplicateConfirmation.getByRole("button", { name: "สร้างสำเนา" }).click();
    const request = await createRequest;
    const payload = request.postDataJSON() as Record<string, unknown>;
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("allocation_id");
    expect(JSON.stringify(payload)).not.toContain("transfer_id");

    await expect(duplicateDialog).toBeHidden();
    const duplicateRow = page
      .getByTestId("allocation-history-row")
      .filter({ hasText: fixture.duplicateNote });
    await expect(duplicateRow).toBeVisible();
    await expect(editedRow).toBeVisible();

    await duplicateRow.locator("button[aria-haspopup='menu']").click();
    await page.getByRole("menuitem", { name: "ลบการจัดสรรเงิน" }).click();
    const deleteConfirmation = page.getByRole("dialog", { name: "ลบการจัดสรรเงิน?" });
    await expect(deleteConfirmation).toBeVisible();
    await deleteConfirmation.getByRole("button", { name: "ลบ" }).click();

    await expect(duplicateRow).toHaveCount(0);
    await expect(editedRow).toBeVisible();
  } finally {
    if (fixture) await cleanupAllocationActionFixtures(page, fixture.marker);
  }
});
