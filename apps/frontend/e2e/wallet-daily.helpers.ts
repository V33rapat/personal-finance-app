import { expect, type Locator, type Page } from "@playwright/test";

export const DAILY_WALLET_NAME = "E2E Daily Wallet";
export const DAILY_DESTINATION_NAME = "E2E Daily Destination";
export const DAILY_PARENT_WITHOUT_CHILD_NAME = "E2E Parent Without Active Child";
export const DAILY_PARENT_WITH_CHILD_NAME = "E2E Daily Parent With Active Child";
export const DAILY_DATE = "2026-07-20";
export const EMPTY_DATE = "2026-07-21";
export const PAGINATION_DATE = "2026-07-24";

function toUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number) {
  const date = toUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

export function getBangkokToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(toUtcDate(value));
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export async function openDailyWallet(
  page: Page,
  walletName = DAILY_WALLET_NAME,
) {
  await page.goto("/wallet");
  const walletButton = page.getByRole("button", {
    name: new RegExp(`^${walletName}`),
  });
  await expect(walletButton).toBeVisible();
  await walletButton.click();
  await expect(
    page.getByRole("heading", { name: walletName, exact: true }),
  ).toBeVisible();
}

export async function openDailyTransactions(
  page: Page,
  walletName = DAILY_WALLET_NAME,
) {
  await openDailyWallet(page, walletName);
  const tab = page.getByRole("button", { name: "รายการ", exact: true });
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(page.getByTestId("daily-summary")).toBeVisible();
}

export async function getSelectedDate(page: Page) {
  const label = await page
    .getByTestId("daily-date-picker-trigger")
    .getAttribute("aria-label");
  const match = label?.match(/\d{4}-\d{2}-\d{2}/);

  if (!match) {
    throw new Error(`Unable to read the selected daily date from: ${label}`);
  }

  return match[0];
}

async function showCalendarMonth(
  dialog: Locator,
  currentDate: string,
  targetDate: string,
) {
  const current = toUtcDate(currentDate);
  const target = toUtcDate(targetDate);
  const offset =
    (target.getUTCFullYear() - current.getUTCFullYear()) * 12 +
    target.getUTCMonth() -
    current.getUTCMonth();
  const label = offset >= 0 ? "แสดงเดือนถัดไป" : "แสดงเดือนก่อนหน้า";

  for (let index = 0; index < Math.abs(offset); index += 1) {
    await dialog.getByRole("button", { name: label, exact: true }).click();
  }
}

export async function openDailyDatePicker(page: Page) {
  const currentDate = await getSelectedDate(page);
  await page.getByTestId("daily-date-picker-trigger").click();
  const dialog = page.getByTestId("daily-date-picker");
  await expect(dialog).toBeVisible();

  return { dialog, currentDate };
}

export async function selectDailyDate(page: Page, targetDate: string) {
  const { dialog, currentDate } = await openDailyDatePicker(page);
  await showCalendarMonth(dialog, currentDate, targetDate);
  const request = waitForDailyRequest(page, { date: targetDate });
  await dialog
    .getByRole("button", { name: `เลือกวันที่ ${targetDate}`, exact: true })
    .click();
  await request;
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`(?:[?&])date=${targetDate}(?:&|$)`));
}

export function waitForDailyRequest(
  page: Page,
  expected: Record<string, string>,
) {
  return page.waitForRequest((request) => {
    const url = new URL(request.url());

    return (
      url.pathname === "/api/transaction/daily" &&
      Object.entries(expected).every(
        ([key, value]) => url.searchParams.get(key) === value,
      )
    );
  });
}

export function getDailyRows(page: Page) {
  return page.getByTestId("daily-transaction-row");
}

export function getDailyRow(page: Page, name: string) {
  return getDailyRows(page).filter({ hasText: name }).first();
}

export async function expectSummary(
  page: Page,
  income: number,
  expense: number,
) {
  await expect(page.getByTestId("daily-summary-income")).toContainText(
    formatMoney(income),
  );
  await expect(page.getByTestId("daily-summary-expense")).toContainText(
    formatMoney(expense),
  );
  await expect(page.getByTestId("daily-summary-net")).toContainText(
    formatMoney(income - expense),
  );
}

export async function selectTransactionType(
  page: Page,
  type: "income" | "expense" | "",
) {
  const request = waitForDailyRequest(page, {
    date: await getSelectedDate(page),
    ...(type ? { type } : {}),
  });
  await page.getByTestId("daily-filter-type").selectOption(type);
  await request;
}

export async function selectTransactionCategory(page: Page, categoryName: string) {
  const category = page.getByTestId("daily-filter-category");
  const categoryId = await category.locator("option").evaluateAll(
    (options, name) =>
      options.find(
        (option): option is HTMLOptionElement =>
          option instanceof HTMLOptionElement && option.textContent === name,
      )?.value ?? null,
    categoryName,
  );

  if (!categoryId) {
    throw new Error(`Missing transaction category option: ${categoryName}`);
  }

  const request = waitForDailyRequest(page, {
    date: await getSelectedDate(page),
    categoryId,
  });
  await category.selectOption(categoryId);
  await request;
}

export async function searchDailyTransactions(page: Page, search: string) {
  const request = waitForDailyRequest(page, {
    date: await getSelectedDate(page),
    search,
  });
  await page.getByTestId("daily-filter-search").fill(search);
  await request;
}
