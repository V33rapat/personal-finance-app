import { expect, test } from "@playwright/test";
import {
  addDays,
  createPlanName,
  createPlanThroughUi,
  getBangkokToday,
} from "./spending-plan.helpers";

test.describe("Spending Plan copy", () => {
  test("copies a plan to another valid one-day period", async ({ page }) => {
    const sourceName = createPlanName("copy-source");
    await createPlanThroughUi(page, {
      name: sourceName,
      startDate: addDays(getBangkokToday(), 7),
    });

    await page.getByRole("button", { name: "คัดลอกแผน", exact: true }).click();
    const copiedStartDate = addDays(getBangkokToday(), 14);
    await page
      .getByLabel("วันเริ่มต้นของแผนใหม่", { exact: true })
      .fill(copiedStartDate);
    await page.getByRole("button", { name: "สร้างสำเนา", exact: true }).click();

    await expect(page).toHaveURL(/\/spending-plans\/[0-9a-f-]+$/);
    await expect(
      page.getByRole("heading", { name: `${sourceName} (สำเนา)`, exact: true }),
    ).toBeVisible();
  });
});
