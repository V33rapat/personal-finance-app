import { expect, test } from "@playwright/test";
import {
  BUDGET_TEXT,
  addDays,
  applyCalendarSelection,
  expectPeriodLabel,
  formatThaiDateRange,
  getBudgetSection,
  getCurrentWeek,
  getBangkokToday,
  openDashboard,
  openPeriodPicker,
  selectBudgetPeriod,
  selectCalendarRange,
  waitForOverviewRequest,
} from "./spending-budget.helpers";

test.describe("Spending Budget weekly reporting period", () => {
  test("selects a seven-day week and sends the exact BFF query", async ({
    page,
  }) => {
    await openDashboard(page);
    await selectBudgetPeriod(page, "weekly");

    const start = "2026-07-20";
    const end = "2026-07-26";
    const dialog = await selectCalendarRange(page, start, end);
    const request = waitForOverviewRequest(page, {
      period: "weekly",
      start,
      end,
    });

    await applyCalendarSelection(dialog);
    await request;
    await expectPeriodLabel(page, formatThaiDateRange(start, end));
  });

  test("allows a future week without showing an error", async ({ page }) => {
    await openDashboard(page);
    await selectBudgetPeriod(page, "weekly");

    const start = addDays(getBangkokToday(), 14);
    const end = addDays(start, 6);
    const dialog = await selectCalendarRange(page, start, end);
    const request = waitForOverviewRequest(page, {
      period: "weekly",
      start,
      end,
    });

    await applyCalendarSelection(dialog);
    await request;
    await expectPeriodLabel(page, formatThaiDateRange(start, end));
    const section = await getBudgetSection(page);
    await expect(section.getByRole("alert")).toHaveCount(0);
  });

  test("resets to the complete Bangkok Monday-Sunday week", async ({ page }) => {
    await openDashboard(page);
    await selectBudgetPeriod(page, "weekly");

    const dialog = await openPeriodPicker(page, "weekly");
    const currentWeek = getCurrentWeek();
    const request = waitForOverviewRequest(page, {
      period: "weekly",
      start: currentWeek.start,
      end: currentWeek.end,
    });

    await dialog
      .getByRole("button", { name: BUDGET_TEXT.resetWeek, exact: true })
      .click();
    await request;
    await expectPeriodLabel(
      page,
      formatThaiDateRange(currentWeek.start, currentWeek.end),
    );
  });
});
