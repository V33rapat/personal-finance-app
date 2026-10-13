import { expect, test } from "@playwright/test";
import {
  createPlanName,
  createPlanThroughUi,
  getPlanTestStartDate,
  openPlans,
} from "./spending-plan.helpers";

test.describe("Spending Plan cancellation", () => {
  test("confirms cancellation and makes the plan read-only", async ({ page }, testInfo) => {
    const name = createPlanName("cancel");
    await createPlanThroughUi(page, {
      name,
      startDate: getPlanTestStartDate(1, testInfo.retry),
    });

    await page.getByRole("button", { name: "ยกเลิกแผน", exact: true }).click();
    await expect(page.getByText("ยกเลิกแผนการใช้เงิน?", { exact: true })).toBeVisible();
    const cancellation = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith("/cancel") &&
      response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "ยกเลิกแผน", exact: true })
      .last()
      .click();
    expect((await cancellation).ok()).toBe(true);
    await expect(page.getByText("ยกเลิกแผนการใช้เงิน?", { exact: true })).toBeHidden();

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
