import { expect, test } from "@playwright/test";
import {
  addDays,
  createPlanName,
  createPlanThroughUi,
  getBangkokToday,
  getPlanTestStartDate,
} from "./spending-plan.helpers";

async function openRangeView(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "ตารางตามช่วงเวลา", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
}

function plannedCells(page: import("@playwright/test").Page) {
  return page.getByRole("table").locator("tbody tr td:nth-child(3)");
}

test.describe("Spending Plan distribution rules", () => {
  test("creates an equal-daily plan and calculates the daily amount", async ({
    page,
  }, testInfo) => {
    const startDate = getPlanTestStartDate(100, testInfo.retry);
    await createPlanThroughUi(page, {
      name: createPlanName("distribution-equal"),
      startDate,
      endDate: addDays(startDate, 2),
      targetAmount: "33.33",
      distribution: { type: "equal_daily" },
    });

    await openRangeView(page);
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(3);
    await expect(plannedCells(page).filter({ hasText: "฿33.33" })).toHaveCount(3);
  });

  test("creates a weekday-only plan", async ({ page }, testInfo) => {
    const startDate = getPlanTestStartDate(120, testInfo.retry);
    await createPlanThroughUi(page, {
      name: createPlanName("distribution-weekdays"),
      startDate,
      endDate: addDays(startDate, 6),
      targetAmount: "20",
      distribution: { type: "weekdays" },
    });

    await openRangeView(page);
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(7);
    await expect(plannedCells(page).filter({ hasText: "฿20.00" })).toHaveCount(5);
    await expect(
      plannedCells(page).filter({ hasText: "฿0.00 / ฿0.00" }),
    ).toHaveCount(2);
  });

  test("creates weekly and biweekly plans with selected weekdays", async ({ page }, testInfo) => {
    const weeklyStart = getPlanTestStartDate(145, testInfo.retry);
    await createPlanThroughUi(page, {
      name: createPlanName("distribution-weekly"),
      startDate: weeklyStart,
      endDate: addDays(weeklyStart, 13),
      targetAmount: "25",
      distribution: { type: "weekly", weekdays: [1, 5] },
    });
    await openRangeView(page);
    await expect(plannedCells(page).filter({ hasText: "฿25.00" })).toHaveCount(4);

    const biweeklyStart = getPlanTestStartDate(170, testInfo.retry);
    await createPlanThroughUi(page, {
      name: createPlanName("distribution-biweekly"),
      startDate: biweeklyStart,
      endDate: addDays(biweeklyStart, 13),
      distribution: { type: "biweekly", weekdays: [1] },
    });
    await openRangeView(page);
    await expect(plannedCells(page).filter({ hasText: "฿100.00" })).toHaveCount(1);
  });

  test("creates a plan on selected specific dates", async ({ page }, testInfo) => {
    const startDate = getPlanTestStartDate(195, testInfo.retry);
    const selectedDates = [startDate, addDays(startDate, 3)];
    await createPlanThroughUi(page, {
      name: createPlanName("distribution-specific"),
      startDate,
      endDate: addDays(startDate, 6),
      targetAmount: "50",
      distribution: { type: "specific_dates", dates: selectedDates },
    });

    await openRangeView(page);
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(7);
    await expect(plannedCells(page).filter({ hasText: "฿50.00" })).toHaveCount(2);
    await expect(
      plannedCells(page).filter({ hasText: "฿0.00 / ฿0.00" }),
    ).toHaveCount(5);
  });

  test("creates a new revision inside its effective window without sending allocations", async ({
    page,
  }, testInfo) => {
    const startDate = addDays(getBangkokToday(), -60 - testInfo.retry);
    const effectiveDate = addDays(startDate, 2);
    await createPlanThroughUi(page, {
      name: createPlanName("distribution-revision"),
      startDate,
      endDate: addDays(startDate, 5),
    });

    await page.getByRole("button", { name: "แก้ไขแผน", exact: true }).click();
    await page.getByLabel("ให้ Revision มีผลตั้งแต่", { exact: true }).fill(effectiveDate);
    const purpose = page.getByTestId("spending-plan-purpose-card").first();
    await purpose.getByTestId("spending-plan-distribution-select").selectOption("specific_dates");
    await purpose
      .getByTestId("spending-plan-specific-date-picker")
      .locator(`[data-date="${effectiveDate}"]`)
      .click();
    await expect(purpose.getByText("เลือก 1 ครั้ง", { exact: false })).toBeVisible();

    const request = page.waitForRequest((candidate) => {
      if (!candidate.url().includes("/api/spending-plan/") || candidate.method() !== "PATCH") {
        return false;
      }
      const body = JSON.parse(candidate.postData() ?? "{}");
      return (
        !Object.hasOwn(body, "amount") &&
        !Object.hasOwn(body.purposes?.[0] ?? {}, "allocations") &&
        body.purposes?.[0]?.distribution?.type === "specific_dates"
      );
    });
    await page.getByRole("button", { name: "บันทึกเป็น Revision ใหม่", exact: true }).click();
    await request;

    await expect(page.getByText("ประวัติ Revision", { exact: true })).toBeVisible();
    await expect(page.locator("details")).toHaveCount(2);
  });

  test("opens a legacy plan copy in the new distribution editor", async ({ page }) => {
    await page.goto("/spending-plans");
    await page.getByRole("link", { name: /E2E Legacy Spending Plan/ }).click();
    await expect(page.getByRole("button", { name: "แก้ไขแผน", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "คัดลอกแผน", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "คัดลอกแผนการใช้เงิน", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "ไปเตรียมสำเนา", exact: true }).click();

    await expect(page).toHaveURL(/\/spending-plans\/new\?copyFrom=/);
    await expect(page.getByRole("heading", { name: "สร้างสำเนาแผน", exact: true })).toBeVisible();
    await expect(
      page.getByText("แผนนี้เป็นรูปแบบเดิม กรุณาเลือกรูปแบบใหม่ก่อนบันทึก Revision", {
        exact: true,
      }),
    ).toBeVisible();

    const copiedPurpose = page.getByTestId("spending-plan-purpose-card").first();
    await copiedPurpose
      .getByTestId("spending-plan-purpose-amount")
      .fill("100");
    await copiedPurpose
      .getByTestId("spending-plan-distribution-select")
      .selectOption("equal_daily");
    await page.getByRole("button", { name: "สร้างแผน", exact: true }).click();
    await expect(page).toHaveURL(/\/spending-plans\/[0-9a-f-]+$/);
  });
});
