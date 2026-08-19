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
      page.getByRole("heading", { name: "ภาพรวมรายเดือน", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("button", { name: `ดูรายละเอียดวันที่ ${startDate}` })
        .getByText("E2E ค่าอาหาร: ฿100.00", { exact: true }),
    ).toBeVisible();
  });

  test("shows inline validation before a malformed plan reaches the BFF", async ({
    page,
  }) => {
    await page.goto("/spending-plans/new");
    await page.getByRole("button", { name: "สร้างแผน", exact: true }).click();

    await expect(page.getByText("กรุณากรอกชื่อแผน 3-100 ตัวอักษร")).toBeVisible();
    await expect(
      page.getByText("กรุณาเลือกกระเป๋าอย่างน้อย 1 ใบ"),
    ).toBeVisible();
    await expect(
      page.getByText("กรอกชื่อ เลือกหมวดหมู่ และยอดของทุกวัตถุประสงค์ให้ครบ"),
    ).toBeVisible();
  });
});
