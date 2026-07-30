import { expect, test } from "@playwright/test";
import {
  DAILY_DATE,
  EMPTY_DATE,
  PAGINATION_DATE,
  addDays,
  expectSummary,
  formatThaiDate,
  getBangkokToday,
  getDailyRows,
  openDailyDatePicker,
  openDailyTransactions,
  selectDailyDate,
  selectTransactionCategory,
  selectTransactionType,
  searchDailyTransactions,
  waitForDailyRequest,
} from "./wallet-daily.helpers";

test.describe("Daily Transaction View navigation and filters", () => {
  test("opens an eligible wallet on today with a canonical date URL", async ({ page }) => {
    const today = getBangkokToday();

    await openDailyTransactions(page);

    await expect(page).toHaveURL(new RegExp(`(?:[?&])date=${today}(?:&|$)`));
    await expect(page.getByTestId("daily-date-picker-trigger")).toContainText(
      formatThaiDate(today),
    );
  });

  test("moves backward and forward one day and disables next on today", async ({ page }) => {
    const today = getBangkokToday();
    const previousDate = addDays(today, -1);

    await openDailyTransactions(page);
    const previousRequest = waitForDailyRequest(page, { date: previousDate });
    await page.getByTestId("daily-previous-day").click();
    await previousRequest;
    await expect(page).toHaveURL(new RegExp(`(?:[?&])date=${previousDate}(?:&|$)`));
    await expect(page.getByTestId("daily-date-picker-trigger")).toContainText(
      formatThaiDate(previousDate),
    );

    const todayRequest = waitForDailyRequest(page, { date: today });
    await page.getByTestId("daily-next-day").click();
    await todayRequest;
    await expect(page.getByTestId("daily-next-day")).toBeDisabled();
  });

  test("selects a historical calendar date, keeps it after refresh, and disables future dates", async ({ page }) => {
    await openDailyTransactions(page);
    await selectDailyDate(page, DAILY_DATE);
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`(?:[?&])date=${DAILY_DATE}(?:&|$)`));
    const walletButton = page.getByRole("button", {
      name: /^E2E Daily Wallet/,
    });
    await walletButton.click();
    await page.getByRole("button", { name: "รายการ", exact: true }).click();
    await expect(page.getByTestId("daily-date-picker-trigger")).toContainText(
      formatThaiDate(DAILY_DATE),
    );

    const today = getBangkokToday();
    const tomorrow = addDays(today, 1);
    await selectDailyDate(page, today);
    const { dialog, currentDate } = await openDailyDatePicker(page);
    const currentMonth = Number(currentDate.slice(5, 7));
    const futureMonth = Number(tomorrow.slice(5, 7));

    if (futureMonth !== currentMonth || tomorrow.slice(0, 4) !== currentDate.slice(0, 4)) {
      await expect(
        dialog.getByRole("button", { name: "แสดงเดือนถัดไป", exact: true }),
      ).toBeDisabled();
    } else {
      await expect(
        dialog.getByRole("button", {
          name: `เลือกวันที่ ${tomorrow}`,
          exact: true,
        }),
      ).toBeDisabled();
    }
  });

  test("shows zero summary and an empty state for a day without transactions", async ({ page }) => {
    await openDailyTransactions(page);
    await selectDailyDate(page, EMPTY_DATE);

    await expect(page.getByTestId("daily-transaction-empty-state")).toBeVisible();
    await expectSummary(page, 0, 0);
  });

  test("keeps daily summary complete while the list is filtered to expenses", async ({ page }) => {
    await openDailyTransactions(page);
    await selectDailyDate(page, DAILY_DATE);
    await expectSummary(page, 2_000, 610);

    await selectTransactionType(page, "expense");
    await expect(page.getByTestId("daily-transaction-row").filter({ hasText: "E2E Daily Income" })).toHaveCount(0);
    await expect(page.getByText("E2E Daily Food Expense", { exact: true })).toBeVisible();
    await expectSummary(page, 2_000, 610);
  });

  test("filters categories by type, resets incompatible categories, searches, and clears selection", async ({ page }) => {
    await openDailyTransactions(page);
    await selectDailyDate(page, DAILY_DATE);
    await selectTransactionType(page, "income");

    const category = page.getByTestId("daily-filter-category");
    await expect(category.getByRole("option", { name: "E2E Daily Income" })).toHaveCount(1);
    await expect(category.getByRole("option", { name: "E2E Daily Food" })).toHaveCount(0);
    await selectTransactionCategory(page, "E2E Daily Income");

    await selectTransactionType(page, "expense");
    await expect(category).toHaveValue("");
    await expect(category.getByRole("option", { name: "E2E Daily Food" })).toHaveCount(1);
    await selectTransactionCategory(page, "E2E Daily Food");
    await searchDailyTransactions(page, "searchable daily food");
    await expect(page.getByText("E2E Daily Food Expense", { exact: true })).toBeVisible();

    const row = page.getByTestId("daily-transaction-row").filter({
      hasText: "E2E Daily Food Expense",
    });
    await row.getByRole("button", { name: /E2E Daily Food Expense$/ }).click();
    await expect(page.getByRole("button", { name: "ลบรายการ", exact: true })).toBeVisible();

    await page.getByTestId("daily-filter-search").fill("");
    await expect(page.getByRole("button", { name: "ลบรายการ", exact: true })).toHaveCount(0);
  });

  test("loads more than fifty transactions without duplicates in newest-first order", async ({ page }) => {
    await openDailyTransactions(page);
    await selectDailyDate(page, PAGINATION_DATE);

    const rows = getDailyRows(page);
    await expect(rows).toHaveCount(50);
    await expect(rows.first()).toContainText("E2E Pagination 52");
    await expect(page.getByTestId("daily-load-more")).toBeVisible();
    await page.getByTestId("daily-load-more").click();
    await expect(rows).toHaveCount(52);
    await expect(rows.last()).toContainText("E2E Pagination 01");

    const labels = await rows.getByTestId("daily-transaction-name").allTextContents();
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("keeps Bangkok calendar dates exact for July and December requests", async ({ page }) => {
    await openDailyTransactions(page);
    await selectDailyDate(page, DAILY_DATE);
    await expect(page).toHaveURL(new RegExp(`(?:[?&])date=${DAILY_DATE}(?:&|$)`));

    const decemberDate = "2025-12-31";
    await selectDailyDate(page, decemberDate);
    await expect(page).toHaveURL(new RegExp(`(?:[?&])date=${decemberDate}(?:&|$)`));
  });
});
