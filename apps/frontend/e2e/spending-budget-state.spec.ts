import { test } from "@playwright/test";
import {
  addDays,
  applyCalendarSelection,
  expectPeriodLabel,
  formatThaiDateRange,
  formatThaiMonth,
  formatThaiYear,
  getBangkokToday,
  openDashboard,
  openPeriodPicker,
  selectBudgetPeriod,
  selectCalendarDate,
  selectCalendarRange,
  waitForOverviewRequest,
} from "./spending-budget.helpers";

test.describe("Spending Budget reporting period state", () => {
  test("preserves the selected week after changing tabs", async ({ page }) => {
    await openDashboard(page);
    await selectBudgetPeriod(page, "weekly");

    const start = "2026-07-20";
    const end = "2026-07-26";
    const dialog = await selectCalendarRange(page, start, end);
    const weeklyRequest = waitForOverviewRequest(page, {
      period: "weekly",
      start,
      end,
    });
    await applyCalendarSelection(dialog);
    await weeklyRequest;

    await selectBudgetPeriod(page, "monthly");
    await selectBudgetPeriod(page, "weekly");
    await expectPeriodLabel(page, formatThaiDateRange(start, end));
  });

  test("requests valid future daily, monthly, and yearly reporting periods", async ({
    page,
  }) => {
    await openDashboard(page);

    const today = getBangkokToday();
    const futureDate = addDays(today, 21);
    await selectBudgetPeriod(page, "daily");
    const dailyDialog = await openPeriodPicker(page, "daily");
    await selectCalendarDate(dailyDialog, "daily", futureDate);
    const dailyRequest = waitForOverviewRequest(page, {
      period: "daily",
      date: futureDate,
    });
    await applyCalendarSelection(dailyDialog);
    await dailyRequest;
    await expectPeriodLabel(page, formatThaiDateRange(futureDate, futureDate));

    const futureYear = Number(today.slice(0, 4)) + 1;
    const futureMonth = `${futureYear}-01`;
    await selectBudgetPeriod(page, "monthly");
    const monthlyDialog = await openPeriodPicker(page, "monthly");
    await monthlyDialog.getByTestId("period-picker-next-year").click();
    const monthlyRequest = waitForOverviewRequest(page, {
      period: "monthly",
      month: futureMonth,
    });
    await monthlyDialog
      .getByRole("button", { name: `Select month ${futureMonth}` })
      .click();
    await monthlyRequest;
    await expectPeriodLabel(page, formatThaiMonth(futureMonth));

    await selectBudgetPeriod(page, "yearly");
    const yearlyDialog = await openPeriodPicker(page, "yearly");
    const yearlyRequest = waitForOverviewRequest(page, {
      period: "yearly",
      year: String(futureYear),
    });
    await yearlyDialog
      .getByRole("button", { name: `Select year ${futureYear}` })
      .click();
    await yearlyRequest;
    await expectPeriodLabel(page, formatThaiYear(String(futureYear)));
  });
});
