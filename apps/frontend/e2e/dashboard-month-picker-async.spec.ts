import { expect, test } from "@playwright/test";
import {
  DASHBOARD_MONTH_PICKER_TEXT,
  addMonths,
  expectSummaryValues,
  formatThaiMonth,
  openDashboard,
  showPickerYear,
  waitForDashboardSummaryResponse,
  type DashboardSummaryPayload,
} from "./dashboard-month-picker.helpers";

function createSummary(month: string, balance: string, spending: string): DashboardSummaryPayload {
  return {
    month,
    total_balance: balance,
    monthly_spending: spending,
    active_wallet_count: 3,
  };
}

function createGate() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function openMonthPicker(page: import("@playwright/test").Page) {
  await page.getByTestId("dashboard-month-picker-trigger").click();
  const dialog = page.getByTestId("dashboard-month-picker-dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Dashboard month picker request recovery", () => {
  test("keeps the latest month when an earlier summary response is delayed", async ({ page }) => {
    const { month: currentMonth } = await openDashboard(page);
    const delayedMonth = addMonths(currentMonth, -1);
    const latestMonth = currentMonth;
    const firstResponseGate = createGate();
    const firstRequestStarted = createGate();
    const firstRouteFinished = createGate();

    await page.route("**/api/dashboard/summary?*", async (route) => {
      const url = new URL(route.request().url());
      const requestedMonth = url.searchParams.get("month");

      if (requestedMonth === delayedMonth) {
        firstRequestStarted.release();
        await firstResponseGate.promise;
        try {
          await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify(createSummary(delayedMonth, "1111.11", "111.11")),
          });
        } catch {
          // The hook aborts this request after the latest month is selected.
        } finally {
          firstRouteFinished.release();
        }
        return;
      }

      if (requestedMonth === latestMonth) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(createSummary(latestMonth, "2222.22", "222.22")),
        });
        return;
      }

      await route.continue();
    });

    try {
      const dialog = await openMonthPicker(page);
      await showPickerYear(page, Number(delayedMonth.slice(0, 4)));
      await dialog.getByTestId(`dashboard-month-option-${delayedMonth}`).click();
      await firstRequestStarted.promise;

      const latestDialog = await openMonthPicker(page);
      await showPickerYear(page, Number(latestMonth.slice(0, 4)));
      const latestResponsePromise = waitForDashboardSummaryResponse(page, latestMonth);
      await latestDialog.getByTestId(`dashboard-month-option-${latestMonth}`).click();
      const latestResponse = await latestResponsePromise;
      expect(latestResponse.ok()).toBe(true);
      await expectSummaryValues(
        page,
        createSummary(latestMonth, "2222.22", "222.22"),
      );
      await expect(page.getByTestId("dashboard-month-picker-trigger")).toHaveAttribute(
        "aria-label",
        `${DASHBOARD_MONTH_PICKER_TEXT.reportingPeriod}: ${formatThaiMonth(latestMonth)}`,
      );

      firstResponseGate.release();
      await firstRouteFinished.promise;
      await expectSummaryValues(
        page,
        createSummary(latestMonth, "2222.22", "222.22"),
      );
    } finally {
      firstResponseGate.release();
      await page.unroute("**/api/dashboard/summary?*");
    }
  });

  test("keeps the selected month on error and retries the same summary request", async ({ page }) => {
    const { month } = await openDashboard(page);
    const targetMonth = addMonths(month, -1);
    let attempts = 0;

    await page.route("**/api/dashboard/summary?*", async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("month") !== targetMonth) {
        await route.continue();
        return;
      }

      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "E2E temporary dashboard summary failure" }),
        });
        return;
      }

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(createSummary(targetMonth, "1234.56", "78.90")),
      });
    });

    try {
      const dialog = await openMonthPicker(page);
      await showPickerYear(page, Number(targetMonth.slice(0, 4)));
      const failedResponsePromise = waitForDashboardSummaryResponse(page, targetMonth);
      await dialog.getByTestId(`dashboard-month-option-${targetMonth}`).click();
      const failedResponse = await failedResponsePromise;
      expect(failedResponse.status()).toBe(500);

      await expect(page.getByTestId("dashboard-summary-error")).toContainText(
        "E2E temporary dashboard summary failure",
      );
      await expect(page.getByTestId("dashboard-month-picker-trigger")).toHaveAttribute(
        "aria-label",
        `${DASHBOARD_MONTH_PICKER_TEXT.reportingPeriod}: ${formatThaiMonth(targetMonth)}`,
      );

      const retryResponsePromise = waitForDashboardSummaryResponse(page, targetMonth);
      await page.getByRole("button", { name: DASHBOARD_MONTH_PICKER_TEXT.retry, exact: true }).click();
      const retryResponse = await retryResponsePromise;
      expect(retryResponse.ok()).toBe(true);
      expect(attempts).toBe(2);
      await expect(page.getByTestId("dashboard-summary-error")).toHaveCount(0);
      await expectSummaryValues(page, createSummary(targetMonth, "1234.56", "78.90"));
    } finally {
      await page.unroute("**/api/dashboard/summary?*");
    }
  });
});
