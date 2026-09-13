import { expect, test } from "@playwright/test";
import {
  createPlanName,
  createPlanThroughUi,
  getPlanTestStartDate,
} from "./spending-plan.helpers";

test.describe("Spending Plan detail views", () => {
  test("switches between monthly, range, and daily views", async ({ page }, testInfo) => {
    const startDate = getPlanTestStartDate(15, testInfo.retry);
    await createPlanThroughUi(page, {
      name: createPlanName("detail"),
      startDate,
    });

    await page
      .getByRole("button", { name: "ตารางตามช่วงเวลา", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "ตารางตามช่วงเวลา", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();

    await page.getByRole("row", { name: `เลือกวันที่ ${startDate}` }).click();
    await page.getByRole("button", { name: "เปิดวันที่เลือก", exact: true }).click();
    await expect(page.getByLabel("เลือกวันที่ดูภาพรวม")).toBeVisible();

    await page
      .getByRole("button", { name: "ภาพรวมรายเดือน", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "ภาพรวมรายเดือน", exact: true }),
    ).toBeVisible();
  });

  test("stores the selected detail view for the plan", async ({ page }, testInfo) => {
    await createPlanThroughUi(page, {
      name: createPlanName("preferences"),
      startDate: getPlanTestStartDate(17, testInfo.retry),
    });

    await page
      .getByRole("button", { name: "ตารางตามช่วงเวลา", exact: true })
      .click();
    await expect(page.getByRole("table")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("table")).toBeVisible();
  });
});
