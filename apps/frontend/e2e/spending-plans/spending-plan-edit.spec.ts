import { expect, test } from "@playwright/test";
import {
  addDays,
  createPlanName,
  createPlanThroughUi,
  getBangkokToday,
} from "./spending-plan.helpers";

test.describe("Spending Plan revisions", () => {
  test("saves an edit as a new revision", async ({ page }) => {
    const startDate = addDays(getBangkokToday(), 5);
    const revisedName = createPlanName("revised");
    await createPlanThroughUi(page, {
      name: createPlanName("edit"),
      startDate,
    });

    await page.getByRole("button", { name: "แก้ไขแผน", exact: true }).click();
    await page.getByLabel("ชื่อแผน", { exact: true }).fill(revisedName);
    await page
      .getByLabel("ให้ Revision มีผลตั้งแต่", { exact: true })
      .fill(startDate);
    await page
      .getByRole("button", { name: "บันทึกเป็น Revision ใหม่", exact: true })
      .click();

    await expect(
      page.getByRole("heading", { name: revisedName, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("ประวัติ Revision", { exact: true })).toBeVisible();
    await expect(page.locator("details")).toHaveCount(2);
  });

  test("can leave edit mode without changing the plan", async ({ page }) => {
    const name = createPlanName("edit-cancel");
    await createPlanThroughUi(page, {
      name,
      startDate: addDays(getBangkokToday(), 6),
    });

    await page.getByRole("button", { name: "แก้ไขแผน", exact: true }).click();
    await page.getByLabel("ชื่อแผน", { exact: true }).fill("Should not save");
    await page.getByRole("button", { name: "ยกเลิก", exact: true }).click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  });
});
