import { expect, test } from "@playwright/test";
import {
  DASHBOARD_CHART_RANGE,
  ensureDashboardChartRange,
  expectTooltipTotal,
  hoverDashboardChartDate,
  openDashboardChart,
  selectChartView,
} from "./dashboard-chart.helpers";

test.describe("Dashboard chart views", () => {
  test("shows category names and totals in the category view", async ({ page }) => {
    const overview = await openDashboardChart(page);
    await ensureDashboardChartRange(page, overview);
    await selectChartView(overview, "categoryView");

    const tooltip = await hoverDashboardChartDate(
      page,
      overview,
      DASHBOARD_CHART_RANGE.start,
    );

    await expect(tooltip).toContainText("E2E เงินเดือน");
    await expect(tooltip).toContainText("E2E อาหาร");
    await expect(tooltip).toContainText("E2E เดินทาง");
    await expectTooltipTotal(tooltip, "income", "รวมรายรับ", 2_000);
    await expectTooltipTotal(tooltip, "expense", "รวมรายจ่าย", 260);
    await expectTooltipTotal(tooltip, "net", "สุทธิ", 1_740);
  });

  test("returns to the total view with income and expense series", async ({ page }) => {
    const overview = await openDashboardChart(page);
    await ensureDashboardChartRange(page, overview);
    await selectChartView(overview, "categoryView");
    await selectChartView(overview, "totalView");

    const tooltip = await hoverDashboardChartDate(
      page,
      overview,
      DASHBOARD_CHART_RANGE.start,
    );

    await expect(tooltip).toContainText("รายรับ");
    await expect(tooltip).toContainText("รายจ่าย");
    await expect(tooltip).not.toContainText("E2E เงินเดือน");
    await expect(tooltip).not.toContainText("E2E อาหาร");
    await expectTooltipTotal(tooltip, "income", "รวมรายรับ", 2_000);
    await expectTooltipTotal(tooltip, "expense", "รวมรายจ่าย", 260);
    await expectTooltipTotal(tooltip, "net", "สุทธิ", 1_740);
  });
});
