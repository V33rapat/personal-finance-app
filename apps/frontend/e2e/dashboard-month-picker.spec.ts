import { expect, test } from "@playwright/test";
import {
  DASHBOARD_MONTH_PICKER_TEXT,
  addMonths,
  formatThaiMonth,
  formatThaiMonthName,
  formatThaiYear,
  openDashboard,
  selectDashboardMonth,
  showPickerYear,
} from "./dashboard-month-picker.helpers";

async function openMonthPicker(page: import("@playwright/test").Page) {
  await page.getByTestId("dashboard-month-picker-trigger").click();
  const dialog = page.getByTestId("dashboard-month-picker-dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Dashboard reporting month picker", () => {
  test("defaults to the current Bangkok month and loads its summary", async ({ page }) => {
    const { month } = await openDashboard(page);
    await expect(page.getByTestId("dashboard-month-picker-trigger")).toContainText(
      formatThaiMonth(month),
    );
  });

  test("shows localized month choices and the Buddhist calendar year", async ({ page }) => {
    const { month } = await openDashboard(page);
    const dialog = await openMonthPicker(page);
    const year = Number(month.slice(0, 4));
    const monthNumber = Number(month.slice(5, 7));
    const option = dialog.getByTestId(`dashboard-month-option-${month}`);

    await expect(option).toContainText(formatThaiMonthName(monthNumber));
    await expect(option).toHaveAttribute(
      "aria-label",
      `${formatThaiMonthName(monthNumber)} ${formatThaiYear(year)}`,
    );
    await expect(dialog.getByText(formatThaiYear(year), { exact: true })).toBeVisible();
  });

  test("selects a historical month and requests the matching summary", async ({ page }) => {
    const { month } = await openDashboard(page);
    const historicalMonth = addMonths(month, -1);
    await openMonthPicker(page);
    await showPickerYear(page, Number(historicalMonth.slice(0, 4)));

    const summary = await selectDashboardMonth(page, historicalMonth);
    expect(summary.month).toBe(historicalMonth);
  });

  test("changes the viewed year without fetching until a month is selected", async ({ page }) => {
    const { month } = await openDashboard(page);
    const currentYear = Number(month.slice(0, 4));
    const requestedMonths: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/api/dashboard/summary") {
        const selected = url.searchParams.get("month");
        if (selected) requestedMonths.push(selected);
      }
    });

    const dialog = await openMonthPicker(page);
    await dialog.getByTestId("dashboard-month-picker-previous-year").click();
    await expect(dialog.getByText(formatThaiYear(currentYear - 1), { exact: true })).toBeVisible();
    await dialog.getByTestId("dashboard-month-picker-next-year").click();
    await expect(dialog.getByText(formatThaiYear(currentYear), { exact: true })).toBeVisible();
    expect(requestedMonths).toEqual([]);
  });

  test("disables future months and prevents navigating beyond the current year", async ({ page }) => {
    const { month } = await openDashboard(page);
    const [yearText, monthText] = month.split("-");
    const year = Number(yearText);
    const currentMonth = Number(monthText);
    const requestedMonths: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/api/dashboard/summary") {
        const selected = url.searchParams.get("month");
        if (selected) requestedMonths.push(selected);
      }
    });

    const dialog = await openMonthPicker(page);
    for (let futureMonth = currentMonth + 1; futureMonth <= 12; futureMonth += 1) {
      const value = `${year}-${String(futureMonth).padStart(2, "0")}`;
      await expect(dialog.getByTestId(`dashboard-month-option-${value}`)).toBeDisabled();
    }
    await expect(dialog.getByTestId("dashboard-month-option-" + month)).toBeEnabled();
    await expect(dialog.getByTestId("dashboard-month-picker-next-year")).toBeDisabled();
    expect(requestedMonths).toEqual([]);
  });
});

test.describe("Dashboard month picker with English browser locale", () => {
  test.use({ locale: "en-US" });

  test("keeps the selected month label in the app language", async ({ page }) => {
    const { month } = await openDashboard(page);
    expect(DASHBOARD_MONTH_PICKER_TEXT.reportingPeriod).toBe("ช่วงเวลารายงาน");
    await expect(page.getByTestId("dashboard-month-picker-trigger")).toContainText(
      formatThaiMonth(month),
    );
  });
});
