import { expect, test } from "@playwright/test";
import { createPlanName, getPlanTestStartDate } from "./spending-plan.helpers";

test("keeps distribution cards usable on mobile without horizontal overflow", async ({
  page,
}, testInfo) => {
  await page.goto("/spending-plans/new");
  await expect(page.getByRole("heading", { name: "สร้างแผนใหม่", exact: true })).toBeVisible();

  await page.getByLabel("ชื่อแผน", { exact: true }).fill(createPlanName("distribution-mobile"));
  const startDate = getPlanTestStartDate(220, testInfo.retry);
  await page.getByLabel("วันเริ่มต้น", { exact: true }).fill(startDate);
  await page.getByLabel("วันสิ้นสุด", { exact: true }).fill(startDate);
  await page.getByTestId("spending-plan-wallet-checkbox").first().check();
  await expect(page.getByRole("group", { name: "กระเป๋าที่เลือก" })).toContainText("E2E");

  const purpose = page.getByTestId("spending-plan-purpose-card").first();
  await purpose.getByTestId("spending-plan-purpose-name").fill("E2E Mobile Purpose");
  await purpose.getByTestId("spending-plan-purpose-amount").fill("100");
  await purpose.getByTestId("spending-plan-category-checkbox").first().check();
  await expect(purpose.getByRole("group", { name: "หมวดหมู่ที่เลือก" })).toContainText("E2E");
  await purpose.getByTestId("spending-plan-distribution-select").selectOption("weekdays");

  await expect(page.getByTestId("spending-plan-purpose-card")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);

  await page.getByTestId("spending-plan-wallet-options").evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
  await expect(page.getByTestId("spending-plan-wallet-options")).toBeInViewport();
});
