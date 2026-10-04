import { expect, type Page, type Response } from "@playwright/test";

export const DASHBOARD_MONTH_PICKER_TEXT = {
  reportingPeriod: "ช่วงเวลารายงาน",
  selectMonth: "เลือกเดือนที่ต้องการดู",
  previousYear: "ปีก่อนหน้า",
  nextYear: "ปีถัดไป",
  retry: "ลองใหม่",
};

export interface DashboardSummaryPayload {
  month: string;
  total_balance: string;
  monthly_spending: string;
  active_wallet_count: number;
}

export function getBangkokMonth(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) throw new Error("Could not determine current Bangkok month");
  return `${year}-${month}`;
}

export function addMonths(value: string, amount: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatThaiMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatThaiMonthName(month: number) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, month - 1, 1)));
}

export function formatThaiYear(year: number) {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, 0, 1)));
}

export function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function waitForDashboardSummaryResponse(
  page: Page,
  month?: string,
): Promise<Response> {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === "GET" &&
      url.pathname === "/api/dashboard/summary" &&
      (!month || url.searchParams.get("month") === month)
    );
  });
}

export async function openDashboard(page: Page) {
  const month = getBangkokMonth();
  const responsePromise = waitForDashboardSummaryResponse(page, month);
  await page.goto("/dashboard");
  const response = await responsePromise;
  const summary = (await response.json()) as DashboardSummaryPayload;
  const trigger = page.getByTestId("dashboard-month-picker-trigger");

  expect(response.ok()).toBe(true);
  expect(summary.month).toBe(month);
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute(
    "aria-label",
    `${DASHBOARD_MONTH_PICKER_TEXT.reportingPeriod}: ${formatThaiMonth(month)}`,
  );
  await expectSummaryValues(page, summary);

  return { month, summary };
}

export async function expectSummaryValues(
  page: Page,
  summary: DashboardSummaryPayload,
) {
  await expect(page.getByTestId("dashboard-summary-total-balance")).toContainText(
    formatCurrency(summary.total_balance),
  );
  await expect(page.getByTestId("dashboard-summary-monthly-spending")).toContainText(
    formatCurrency(summary.monthly_spending),
  );
  await expect(page.getByTestId("dashboard-summary-active-wallet-count")).toContainText(
    String(summary.active_wallet_count),
  );
}

export async function showPickerYear(page: Page, year: number) {
  const dialog = page.getByTestId("dashboard-month-picker-dialog");
  await expect(dialog).toBeVisible();
  const displayedYear = dialog.locator("[aria-live='polite']");

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const currentYearText = await displayedYear.textContent();
    const currentYear = Number(currentYearText?.replace(/\D/g, "")) - 543;
    if (!Number.isFinite(currentYear)) {
      throw new Error(`Unable to read displayed picker year: ${currentYearText}`);
    }
    if (currentYear === year) return dialog;

    const nextYear = currentYear + (currentYear < year ? 1 : -1);
    const testId = currentYear < year
      ? "dashboard-month-picker-next-year"
      : "dashboard-month-picker-previous-year";
    await dialog.getByTestId(testId).click();
    await expect(displayedYear).toHaveText(formatThaiYear(nextYear));
  }

  throw new Error(`Unable to navigate month picker to year ${year}`);
}

export async function selectDashboardMonth(page: Page, month: string) {
  const option = page.getByTestId(`dashboard-month-option-${month}`);
  await expect(option).toBeVisible();
  await expect(option).toBeEnabled();
  const responsePromise = waitForDashboardSummaryResponse(page, month);
  await option.click();
  const response = await responsePromise;
  const summary = (await response.json()) as DashboardSummaryPayload;

  await expect(page.getByTestId("dashboard-month-picker-dialog")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-month-picker-trigger")).toHaveAttribute(
    "aria-label",
    `${DASHBOARD_MONTH_PICKER_TEXT.reportingPeriod}: ${formatThaiMonth(month)}`,
  );
  await expectSummaryValues(page, summary);
  return summary;
}
