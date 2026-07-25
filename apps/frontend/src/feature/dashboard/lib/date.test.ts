import { describe, expect, it } from "vitest";
import { toDateString } from "./date";
import { getSpendingBudgetOverviewSearchParams } from "./spendingBudget";

describe("dashboard date helpers", () => {
  it("uses the selected Bangkok date in the spending budget request", () => {
    const date = toDateString(new Date("2026-07-19T17:00:00.000Z"));

    expect(
      getSpendingBudgetOverviewSearchParams({ period: "daily", date }).toString(),
    ).toBe("period=daily&date=2026-07-20");
  });

  it.each([
    ["keeps the date before Bangkok midnight", "2026-07-19T16:59:59.999Z", "2026-07-19"],
    ["moves to the next date at Bangkok midnight", "2026-07-19T17:00:00.000Z", "2026-07-20"],
    ["keeps a late UTC time on its Bangkok calendar date", "2026-07-19T23:30:00.000Z", "2026-07-20"],
    ["crosses into the next month", "2026-07-31T17:00:00.000Z", "2026-08-01"],
    ["crosses into the next year", "2026-12-31T17:00:00.000Z", "2027-01-01"],
  ])("%s", (_label, value, expected) => {
    expect(toDateString(new Date(value))).toBe(expected);
  });
});
