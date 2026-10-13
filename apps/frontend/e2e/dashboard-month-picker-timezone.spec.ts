import { expect, test } from "@playwright/test";
import { openDashboardAtFixedBrowserTime } from "./dashboard-month-picker.timezone.helpers";

const BANGKOK_MONTH_BOUNDARIES = [
  {
    title: "before Bangkok midnight at the end of July",
    instant: "2026-07-31T16:59:59.999Z",
    month: "2026-07",
  },
  {
    title: "at Bangkok midnight entering August",
    instant: "2026-07-31T17:00:00.000Z",
    month: "2026-08",
  },
  {
    title: "before Bangkok midnight at the end of the year",
    instant: "2025-12-31T16:59:59.999Z",
    month: "2025-12",
  },
  {
    title: "at Bangkok midnight entering the next year",
    instant: "2025-12-31T17:00:00.000Z",
    month: "2026-01",
  },
];

test.describe("Dashboard reporting month Bangkok boundaries", () => {
  for (const boundary of BANGKOK_MONTH_BOUNDARIES) {
    test(`selects ${boundary.month} ${boundary.title}`, async ({ page }) => {
      const summary = await openDashboardAtFixedBrowserTime(
        page,
        boundary.instant,
        boundary.month,
      );
      expect(summary.month).toBe(boundary.month);
    });
  }
});
