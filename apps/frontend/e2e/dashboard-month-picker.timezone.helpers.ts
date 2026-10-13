import { expect, type Page } from "@playwright/test";
import {
  DASHBOARD_MONTH_PICKER_TEXT,
  expectSummaryValues,
  formatThaiMonth,
  waitForDashboardSummaryResponse,
  type DashboardSummaryPayload,
} from "./dashboard-month-picker.helpers";

export async function openDashboardAtFixedBrowserTime(
  page: Page,
  instant: string,
  expectedMonth: string,
) {
  await page.goto("/transactions");
  const dashboardLink = page.locator('a[href="/dashboard"]:visible').first();
  await expect(dashboardLink).toBeVisible();
  await page.clock.setFixedTime(new Date(instant));

  const responsePromise = waitForDashboardSummaryResponse(page, expectedMonth);
  await dashboardLink.click();
  const response = await responsePromise;
  const summary = (await response.json()) as DashboardSummaryPayload;

  expect(response.ok()).toBe(true);
  await expect(page.getByTestId("dashboard-month-picker-trigger")).toHaveAttribute(
    "aria-label",
    `${DASHBOARD_MONTH_PICKER_TEXT.reportingPeriod}: ${formatThaiMonth(expectedMonth)}`,
  );
  await expectSummaryValues(page, summary);
  return summary;
}
