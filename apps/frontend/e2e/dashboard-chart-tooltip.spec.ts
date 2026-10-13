import { expect, test } from "@playwright/test";
import {
  DASHBOARD_CHART_RANGE,
  ensureDashboardChartRange,
  expectTooltipTotal,
  hoverDashboardChartDate,
  openDashboardChart,
  selectChartTransactionType,
} from "./dashboard-chart.helpers";

test.describe("Dashboard chart tooltip totals", () => {
  test("shows the selected date and exact totals in all mode", async ({
    page,
  }) => {
    const overview = await openDashboardChart(page);
    await ensureDashboardChartRange(page, overview);

    const tooltip = await hoverDashboardChartDate(
      page,
      overview,
      DASHBOARD_CHART_RANGE.start,
    );

    await expect(tooltip).toContainText("20/07/2026");
    await expect(tooltip).toContainText("รายรับ");
    await expect(tooltip).toContainText("รายจ่าย");
    await expectTooltipTotal(tooltip, "income", "รวมรายรับ", 2_000);
    await expectTooltipTotal(tooltip, "expense", "รวมรายจ่าย", 260);
    await expectTooltipTotal(tooltip, "net", "สุทธิ", 1_740);
  });

  test("shows only income totals when the income toggle is active", async ({ page }) => {
    const overview = await openDashboardChart(page);
    await ensureDashboardChartRange(page, overview);
    await selectChartTransactionType(overview, "income");

    const tooltip = await hoverDashboardChartDate(
      page,
      overview,
      DASHBOARD_CHART_RANGE.start,
    );

    await expect(tooltip).toContainText("รายรับ");
    await expectTooltipTotal(tooltip, "income", "รวมรายรับ", 2_000);
    await expect(tooltip.getByTestId("dashboard-overview-chart-total-expense")).toHaveCount(0);
    await expect(tooltip.getByTestId("dashboard-overview-chart-total-net")).toHaveCount(0);
  });

  test("shows only expense totals when the expense toggle is active", async ({ page }) => {
    const overview = await openDashboardChart(page);
    await ensureDashboardChartRange(page, overview);
    await selectChartTransactionType(overview, "expense");

    const tooltip = await hoverDashboardChartDate(
      page,
      overview,
      DASHBOARD_CHART_RANGE.start,
    );

    await expect(tooltip).toContainText("รายจ่าย");
    await expectTooltipTotal(tooltip, "expense", "รวมรายจ่าย", 260);
    await expect(tooltip.getByTestId("dashboard-overview-chart-total-income")).toHaveCount(0);
    await expect(tooltip.getByTestId("dashboard-overview-chart-total-net")).toHaveCount(0);
  });
});
