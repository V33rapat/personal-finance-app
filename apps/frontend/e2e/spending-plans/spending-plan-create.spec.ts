import { expect, test } from "@playwright/test";
import {
  createPlanName,
  createPlanThroughUi,
  getPlanTestStartDate,
} from "./spending-plan.helpers";

test.describe("Spending Plan creation", () => {
  test("creates a plan through the authenticated UI", async ({ page }, testInfo) => {
    const name = createPlanName("create");

    const startDate = getPlanTestStartDate(13, testInfo.retry);
    await createPlanThroughUi(page, {
      name,
      startDate,
    });

    await expect(
      page.getByRole("button", { name: "ภาพรวมรายเดือน", exact: true }),
    ).toBeVisible();
    const selectedDay = page.getByRole("button", {
      name: `เลือกวันที่ ${startDate}`,
      exact: true,
    });
    await selectedDay.click();
    await expect(page.getByRole("button", { name: "ดูภาพรวม", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "ดูภาพรวม", exact: true }).click();
    await expect(page.getByLabel("เลือกวันที่ดูภาพรวม")).toBeVisible();
  });

  test("shows inline validation before a malformed plan reaches the BFF", async ({
    page,
  }) => {
    await page.goto("/spending-plans/new");
    await page.getByRole("button", { name: "สร้างแผน", exact: true }).click();

    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("keeps category searches separate and shows selected category and wallet chips", async ({
    page,
  }) => {
    await page.goto("/spending-plans/new");
    await page.getByTestId("spending-plan-wallet-checkbox").first().check();
    await expect(page.getByRole("group", { name: "กระเป๋าที่เลือก" })).toContainText("E2E");

    const firstPurpose = page.getByTestId("spending-plan-purpose-card").first();
    await firstPurpose.getByTestId("spending-plan-category-checkbox").first().check();
    await expect(firstPurpose.getByRole("group", { name: "หมวดหมู่ที่เลือก" })).toContainText("การเดินทาง");

    await page.getByRole("button", { name: "เพิ่มวัตถุประสงค์", exact: true }).click();
    const secondPurpose = page.getByTestId("spending-plan-purpose-card").nth(1);
    await firstPurpose.getByLabel("ค้นหาหมวดหมู่รายจ่าย").fill("เดินทาง");
    await secondPurpose.getByLabel("ค้นหาหมวดหมู่รายจ่าย").fill("อาหาร");

    await expect(firstPurpose.getByTestId("spending-plan-category-options")).toContainText("การเดินทาง");
    await expect(firstPurpose.getByTestId("spending-plan-category-options")).not.toContainText("อาหาร/เครื่องดื่ม");
    await expect(secondPurpose.getByTestId("spending-plan-category-options")).toContainText("อาหาร/เครื่องดื่ม");
  });
});
