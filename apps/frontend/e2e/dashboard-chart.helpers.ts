import { expect, type Locator, type Page } from "@playwright/test";

export const DASHBOARD_CHART_TEXT = {
  heading: "ภาพรวมรายรับ-รายจ่าย",
  selectDateRange: "เลือกช่วงวันที่",
  applyDateRange: "ใช้ช่วงนี้",
  all: "ทั้งหมด",
  income: "รายรับ",
  expense: "รายจ่าย",
  totalView: "ยอดรวม",
  categoryView: "แยกหมวดหมู่",
};

export const DASHBOARD_CHART_RANGE = {
  start: "2026-07-20",
  end: "2026-07-21",
};

function formatThaiDateRange(start: string, end: string) {
  const formatDate = (value: string) => {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  };

  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export async function openDashboardChart(page: Page) {
  await page.goto("/dashboard");

  const overview = page.getByTestId("dashboard-overview");
  await expect(overview.getByRole("heading", { name: DASHBOARD_CHART_TEXT.heading })).toBeVisible();
  await expect(overview.getByTestId("dashboard-overview-chart")).toBeVisible();

  return overview;
}

export async function ensureDashboardChartRange(page: Page, overview: Locator) {
  const picker = overview.getByRole("button", {
    name: new RegExp(`^${DASHBOARD_CHART_TEXT.selectDateRange}:`),
  });
  const expectedLabel = formatThaiDateRange(
    DASHBOARD_CHART_RANGE.start,
    DASHBOARD_CHART_RANGE.end,
  );

  if ((await picker.getAttribute("aria-label"))?.includes(expectedLabel)) {
    return;
  }

  await picker.click();
  const dialog = page.getByRole("dialog", {
    name: DASHBOARD_CHART_TEXT.selectDateRange,
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: `เลือกวันที่ ${DASHBOARD_CHART_RANGE.start}` })
    .click();
  await dialog
    .getByRole("button", { name: `เลือกวันที่ ${DASHBOARD_CHART_RANGE.end}` })
    .click();

  const request = page.waitForRequest((candidate) => {
    const url = new URL(candidate.url());

    return (
      url.pathname === "/api/dashboard/overview" &&
      url.searchParams.get("start") === DASHBOARD_CHART_RANGE.start &&
      url.searchParams.get("end") === DASHBOARD_CHART_RANGE.end
    );
  });
  await dialog
    .getByRole("button", { name: DASHBOARD_CHART_TEXT.applyDateRange, exact: true })
    .click();
  await request;
  await expect(picker).toHaveAttribute("aria-label", `${DASHBOARD_CHART_TEXT.selectDateRange}: ${expectedLabel}`);
}

export async function hoverDashboardChartDate(
  page: Page,
  overview: Locator,
  date: string,
) {
  const chart = overview.getByTestId("dashboard-overview-chart");
  const tick = chart.getByTestId(`dashboard-overview-chart-date-${date}`);

  await expect(tick).toBeVisible();
  await chart.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const [chartBox, tickBox] = await Promise.all([chart.boundingBox(), tick.boundingBox()]);

  if (!chartBox || !tickBox) {
    throw new Error(`Could not calculate chart coordinates for ${date}`);
  }

  await chart.hover({
    position: {
      x: tickBox.x + tickBox.width / 2 - chartBox.x,
      y: chartBox.height / 2,
    },
  });
  const tooltip = chart.getByTestId("dashboard-overview-chart-tooltip");
  await expect(tooltip).toBeVisible();

  return tooltip;
}

export async function selectChartTransactionType(
  overview: Locator,
  type: "all" | "income" | "expense",
) {
  const label = DASHBOARD_CHART_TEXT[type];
  const button = overview
    .getByRole("group", { name: "ประเภทรายการในกราฟ" })
    .getByRole("button", { name: label, exact: true });

  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

export async function selectChartView(
  overview: Locator,
  view: "totalView" | "categoryView",
) {
  const button = overview.getByRole("button", {
    name: DASHBOARD_CHART_TEXT[view],
    exact: true,
  });

  await button.click();
}

export async function expectTooltipTotal(
  tooltip: Locator,
  type: "income" | "expense" | "net",
  label: string,
  amount: number,
) {
  await expect(tooltip.getByTestId(`dashboard-overview-chart-total-${type}`)).toContainText(
    `${label}${formatCurrency(amount)}`,
  );
}
