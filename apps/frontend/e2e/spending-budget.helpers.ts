import { expect, type Locator, type Page } from "@playwright/test";

export const BUDGET_TEXT = {
  daily: "ดูรายวัน",
  weekly: "ดูรายสัปดาห์",
  monthly: "ดูรายเดือน",
  yearly: "ดูรายปี",
  apply: "ใช้ช่วงนี้",
  resetWeek: "เลือกสัปดาห์ปัจจุบัน",
};

type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

function getBangkokDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function toUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function getBangkokToday() {
  const { year, month, day } = getBangkokDateParts();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDays(value: string, days: number) {
  const date = toUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

export function getCurrentWeek() {
  const today = toUtcDate(getBangkokToday());
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - daysSinceMonday);

  return {
    start: toDateString(start),
    end: addDays(toDateString(start), 6),
  };
}

export function formatThaiDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  if (start === end) {
    return formatter.format(toUtcDate(start));
  }

  return `${formatter.format(toUtcDate(start))} - ${formatter.format(toUtcDate(end))}`;
}

export function formatThaiMonth(month: string) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(toUtcDate(`${month}-01`));
}

export function formatThaiYear(year: string) {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    timeZone: "UTC",
  }).format(toUtcDate(`${year}-01-01`));
}

function getTabLabel(period: BudgetPeriod) {
  return BUDGET_TEXT[period];
}

function getPickerLabel(period: BudgetPeriod) {
  const labels: Record<BudgetPeriod, string> = {
    daily: "เลือกวันที่",
    weekly: "เลือกสัปดาห์",
    monthly: "เลือกเดือน",
    yearly: "เลือกปี",
  };

  return labels[period];
}

export async function getBudgetSection(page: Page) {
  const heading = page.getByRole("heading", { name: "งบใช้จ่าย", exact: true });
  await expect(heading).toBeVisible();
  return heading.locator("xpath=ancestor::section");
}

export async function openDashboard(page: Page) {
  await page.goto("/dashboard");
  await getBudgetSection(page);
}

export async function selectBudgetPeriod(page: Page, period: BudgetPeriod) {
  const section = await getBudgetSection(page);
  const tab = section.getByRole("tab", { name: getTabLabel(period), exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

export async function openPeriodPicker(page: Page, period: BudgetPeriod) {
  const section = await getBudgetSection(page);
  await section
    .getByRole("button", { name: new RegExp(`^${getPickerLabel(period)}:`) })
    .click();

  const dialog = page.getByRole("dialog", { name: getPickerLabel(period) });
  await expect(dialog).toBeVisible();
  return dialog;
}

const thaiMonthNames = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

async function showCalendarMonth(dialog: Locator, targetDate: string) {
  const target = toUtcDate(targetDate);
  const targetButton = dialog.getByRole("button", {
    name: `เลือกวันที่ ${targetDate}`,
  });

  for (let index = 0; index < 24; index += 1) {
    if ((await targetButton.count()) > 0) return;

    const calendarLabel = (await dialog.getByRole("status").textContent()) ?? "";
    const currentMonth = thaiMonthNames.findIndex((month) =>
      calendarLabel.includes(month),
    );
    const yearMatch = calendarLabel.match(/\d{4}/);
    const currentYear = yearMatch ? Number(yearMatch[0]) : NaN;

    if (currentMonth < 0 || !Number.isFinite(currentYear)) {
      throw new Error(`Unable to read calendar month from: ${calendarLabel}`);
    }

    const currentCalendarDate = new Date(
      Date.UTC(currentYear, currentMonth, 1),
    );
    const targetCalendarDate = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), 1),
    );
    const navigationLabel =
      targetCalendarDate > currentCalendarDate
        ? "แสดงเดือนถัดไป"
        : "แสดงเดือนก่อนหน้า";

    await dialog.getByRole("button", { name: navigationLabel, exact: true }).click();
  }

  throw new Error(`Unable to show calendar month for: ${targetDate}`);
}

export async function selectCalendarDate(
  dialog: Locator,
  period: "daily" | "weekly",
  date: string,
) {
  await showCalendarMonth(dialog, date);
  await dialog.getByRole("button", { name: `เลือกวันที่ ${date}` }).click();
}

export async function selectCalendarRange(
  page: Page,
  start: string,
  end: string,
) {
  const dialog = await openPeriodPicker(page, "weekly");
  await showCalendarMonth(dialog, start);
  const startButton = dialog.getByRole("button", {
    name: `เลือกวันที่ ${start}`,
  });
  await startButton.click();
  await showCalendarMonth(dialog, end);
  await dialog.getByRole("button", { name: `เลือกวันที่ ${end}` }).click();
  return dialog;
}

export async function applyCalendarSelection(dialog: Locator) {
  await dialog.getByRole("button", { name: BUDGET_TEXT.apply, exact: true }).click();
  await expect(dialog).toBeHidden();
}

export async function expectPeriodLabel(page: Page, expected: string) {
  await expect(page.getByTestId("spending-budget-period-label")).toHaveText(
    expected,
  );
}

export async function waitForOverviewRequest(
  page: Page,
  expected: Record<string, string>,
) {
  return page.waitForRequest((request) => {
    const url = new URL(request.url());

    return (
      url.pathname === "/api/spending-budget/overview" &&
      Object.entries(expected).every(
        ([key, value]) => url.searchParams.get(key) === value,
      )
    );
  });
}

export async function expectNoOverviewRequest(
  page: Page,
  action: () => Promise<void>,
) {
  let requestCount = 0;
  const listener = (request: { url: () => string }) => {
    if (new URL(request.url()).pathname === "/api/spending-budget/overview") {
      requestCount += 1;
    }
  };

  page.on("request", listener);
  await action();
  await page.waitForTimeout(500);
  page.off("request", listener);

  expect(requestCount).toBe(0);
}
