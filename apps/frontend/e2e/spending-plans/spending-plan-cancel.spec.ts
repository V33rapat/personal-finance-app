import { expect, test } from "@playwright/test";
import {
  addDays,
  createPlanName,
  createPlanThroughUi,
  getBangkokToday,
  openPlans,
} from "./spending-plan.helpers";

test.describe("Spending Plan cancellation", () => {
  test("confirms cancellation and makes the plan read-only", async ({ page }) => {
    const name = createPlanName("cancel");
    await createPlanThroughUi(page, {
      name,
      startDate: addDays(getBangkokToday(), 8),
    });

    await page.getByRole("button", { name: "ยกเลิกแผน", exact: true }).click();
    await expect(page.getByText("ยกเลิกแผนการใช้เงิน?", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "ยกเลิกแผน", exact: true })
      .last()
      .click();

    await openPlans(page);
    const planCard = page.getByRole("link", { name: new RegExp(name) });
    await expect(planCard).toContainText("ยกเลิกแล้ว");
    await planCard.click();
    await expect(
      page.getByRole("button", { name: "แก้ไขแผน", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "ยกเลิกแผน", exact: true }),
    ).toHaveCount(0);
  });
});
