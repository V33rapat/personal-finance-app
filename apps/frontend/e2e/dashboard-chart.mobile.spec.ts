import { expect, test } from "@playwright/test";
import {
  DASHBOARD_CHART_TEXT,
  ensureDashboardChartRange,
  openDashboardChart,
} from "./dashboard-chart.helpers";

test("keeps dashboard chart controls and content inside the mobile viewport", async ({ page }) => {
  const overview = await openDashboardChart(page);
  await ensureDashboardChartRange(page, overview);

  const transactionTypeToggle = overview.getByRole("group", {
    name: "ประเภทรายการในกราฟ",
  });
  const datePicker = overview.getByRole("button", {
    name: new RegExp(`^${DASHBOARD_CHART_TEXT.selectDateRange}:`),
  });
  const chart = overview.getByTestId("dashboard-overview-chart");

  await transactionTypeToggle.scrollIntoViewIfNeeded();
  await expect(transactionTypeToggle).toBeInViewport();
  await datePicker.scrollIntoViewIfNeeded();
  await expect(datePicker).toBeInViewport();
  await chart.scrollIntoViewIfNeeded();
  await expect(chart).toBeInViewport();

  await datePicker.click();
  const dialog = page.getByRole("dialog", {
    name: DASHBOARD_CHART_TEXT.selectDateRange,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeInViewport();

  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
});
