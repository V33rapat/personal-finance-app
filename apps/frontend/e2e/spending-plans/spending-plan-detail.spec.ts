import { expect, test } from "@playwright/test";
import {
  addDays,
  createPlanName,
  createPlanThroughUi,
  getBangkokToday,
} from "./spending-plan.helpers";

test.describe("Spending Plan detail views", () => {
  test("switches between monthly, range, and daily views", async ({ page }) => {
    await createPlanThroughUi(page, {
      name: createPlanName("detail"),
      startDate: addDays(getBangkokToday(), 3),
    });

    await page
      .getByRole("button", { name: "ตารางตามช่วงเวลา", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "ตารางตามช่วงเวลา", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();

    await page
      .getByRole("button", { name: "ภาพรวมต่อวัน", exact: true })
      .click();
    await expect(page.getByText("ภาพรวมต่อวัน:", { exact: false })).toBeVisible();

    await page
      .getByRole("button", { name: "ภาพรวมรายเดือน", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "ภาพรวมรายเดือน", exact: true }),
    ).toBeVisible();
  });

  test("stores the selected detail view for the plan", async ({ page }) => {
    await createPlanThroughUi(page, {
      name: createPlanName("preferences"),
      startDate: addDays(getBangkokToday(), 4),
    });

    await page
      .getByRole("button", { name: "ตารางตามช่วงเวลา", exact: true })
      .click();
    await expect(page.getByRole("table")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("table")).toBeVisible();
  });
});
