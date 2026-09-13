import { expect, test } from "@playwright/test";
import {
  DASHBOARD_CHART_RANGE,
  ensureDashboardChartRange,
  expectTooltipTotal,
  hoverDashboardChartDate,
  openDashboardChart,
  selectChartTransactionType,
} from "./dashboard-chart.helpers";

test.describe("Dashboard chart empty days", () => {
  test("shows zero totals for a selected day without transactions", async ({ page }) => {
    const overview = await openDashboardChart(page);
    await ensureDashboardChartRange(page, overview);
    await selectChartTransactionType(overview, "all");

    const tooltip = await hoverDashboardChartDate(
      page,
      overview,
      DASHBOARD_CHART_RANGE.end,
    );

    await expect(tooltip).toContainText("21 ก.ค.");
    await expect(tooltip).not.toContainText("E2E เงินเดือน");
    await expect(tooltip).not.toContainText("E2E อาหาร");
    await expectTooltipTotal(tooltip, "income", "รวมรายรับ", 0);
    await expectTooltipTotal(tooltip, "expense", "รวมรายจ่าย", 0);
    await expectTooltipTotal(tooltip, "net", "สุทธิ", 0);
  });
});
