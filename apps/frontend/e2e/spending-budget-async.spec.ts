import { expect, test, type Route } from "@playwright/test";
import {
  applyCalendarSelection,
  expectPeriodLabel,
  formatThaiDateRange,
  getBudgetSection,
  openDashboard,
  selectBudgetPeriod,
  selectCalendarRange,
  waitForOverviewRequest,
} from "./spending-budget.helpers";

function overviewResponse(start: string, end: string, name: string) {
  return {
    period: "weekly",
    period_start: start,
    period_end: end,
    budgets: [
      {
        id: `budget-${name}`,
        name,
        amount: "1000.00",
        period: "weekly",
        includes_uncategorized: true,
        is_active: true,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        categories: [],
        spent: "100.00",
        remaining: "900.00",
        percentage: 10,
        status: "on_track",
      },
    ],
  };
}

test.describe("Spending Budget asynchronous overview states", () => {
  test("keeps the latest range when an older response is delayed", async ({ page }) => {
    await openDashboard(page);
    await selectBudgetPeriod(page, "weekly");

    const firstRange = { start: "2026-07-06", end: "2026-07-12" };
    const secondRange = { start: "2026-07-20", end: "2026-07-26" };
    let resolveDelayedRoute: (route: Route) => void;
    const delayedRoute = new Promise<Route>((resolve) => {
      resolveDelayedRoute = resolve;
    });
    await page.route("**/api/spending-budget/overview?*", async (route) => {
      const url = new URL(route.request().url());

      if (url.searchParams.get("start") === firstRange.start) {
        resolveDelayedRoute(route);
        return;
      }

      if (url.searchParams.get("start") === secondRange.start) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            overviewResponse(secondRange.start, secondRange.end, "Latest budget"),
          ),
        });
        return;
      }

      await route.continue();
    });

    try {
      const firstDialog = await selectCalendarRange(
        page,
        firstRange.start,
        firstRange.end,
      );
      await applyCalendarSelection(firstDialog);
      const firstRoute = await delayedRoute;

      const secondDialog = await selectCalendarRange(
        page,
        secondRange.start,
        secondRange.end,
      );
      await applyCalendarSelection(secondDialog);

      await expectPeriodLabel(
        page,
        formatThaiDateRange(secondRange.start, secondRange.end),
      );
      await expect(page.getByRole("heading", { name: "Latest budget" })).toBeVisible();
      await firstRoute.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          overviewResponse(firstRange.start, firstRange.end, "Delayed budget"),
        ),
      }).catch(() => undefined);
      await expect(page.getByRole("heading", { name: "Latest budget" })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Delayed budget" }),
      ).toHaveCount(0);
    } finally {
      if (!page.isClosed()) {
        await page.unroute("**/api/spending-budget/overview?*");
      }
    }
  });

  test("keeps the selected range and retries the same failed overview request", async ({
    page,
  }) => {
    await openDashboard(page);
    await selectBudgetPeriod(page, "weekly");

    const range = { start: "2026-07-20", end: "2026-07-26" };
    let attemptCount = 0;
    await page.route("**/api/spending-budget/overview?*", async (route) => {
      const url = new URL(route.request().url());

      if (
        url.searchParams.get("start") !== range.start ||
        url.searchParams.get("end") !== range.end
      ) {
        await route.continue();
        return;
      }

      attemptCount += 1;
      if (attemptCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Temporary overview failure" }),
        });
        return;
      }

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          overviewResponse(range.start, range.end, "Recovered budget"),
        ),
      });
    });

    try {
      const dialog = await selectCalendarRange(page, range.start, range.end);
      await applyCalendarSelection(dialog);

      const section = await getBudgetSection(page);
      await expect(section.getByRole("alert")).toContainText(
        "Temporary overview failure",
      );
      await expectPeriodLabel(page, formatThaiDateRange(range.start, range.end));

      const retryRequest = waitForOverviewRequest(page, {
        period: "weekly",
        start: range.start,
        end: range.end,
      });
      await section.getByRole("button", { name: "ลองใหม่", exact: true }).click();
      await retryRequest;
      await expect(
        page.getByRole("heading", { name: "Recovered budget" }),
      ).toBeVisible();
      await expect(section.getByRole("alert")).toHaveCount(0);
      expect(attemptCount).toBe(2);
    } finally {
      if (!page.isClosed()) {
        await page.unroute("**/api/spending-budget/overview?*");
      }
    }
  });
});
