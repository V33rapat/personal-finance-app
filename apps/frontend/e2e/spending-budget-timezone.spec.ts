import { expect, test } from "@playwright/test";
import {
  applyCalendarSelection,
  expectPeriodLabel,
  formatThaiDateRange,
  getBudgetSection,
  openDashboard,
  openPeriodPicker,
  selectBudgetPeriod,
  selectCalendarDate,
  waitForOverviewRequest,
} from "./spending-budget.helpers";

test.describe("Spending Budget Bangkok date selection", () => {
  for (const date of ["2026-07-20", "2026-12-31"]) {
    test(`keeps ${date} in the BFF query without shifting calendar days`, async ({
      page,
    }) => {
      await openDashboard(page);
      await selectBudgetPeriod(page, "daily");

      const dialog = await openPeriodPicker(page, "daily");
      await selectCalendarDate(dialog, "daily", date);
      const request = waitForOverviewRequest(page, { period: "daily", date });

      await applyCalendarSelection(dialog);
      await request;
      await expectPeriodLabel(page, formatThaiDateRange(date, date));
    });
  }

  test("keeps desktop controls and the picker inside the viewport", async ({
    page,
  }) => {
    await openDashboard(page);
    const section = await getBudgetSection(page);
    const tabList = section.getByRole("tablist");
    const pickerTrigger = section.getByRole("button", {
      name: /^เลือกวันที่:/,
    });

    await expect(tabList).toBeInViewport();
    await expect(pickerTrigger).toBeInViewport();
    await expect(page.getByTestId("spending-budget-period-label")).toBeInViewport();

    const dialog = await openPeriodPicker(page, "daily");
    await expect(dialog).toBeInViewport();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );

    expect(hasHorizontalOverflow).toBe(false);
  });
});
