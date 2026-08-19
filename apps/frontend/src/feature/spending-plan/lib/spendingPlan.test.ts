import { describe, expect, it } from "vitest";
import {
  createPurpose,
  getDistributionDates,
  getDistributionPreview,
  getPlanDates,
  getSpendingPlanValidationErrors,
} from "./spendingPlan";

describe("spending plan distribution helpers", () => {
  it("creates a purpose with equal daily distribution by default", () => {
    const purpose = createPurpose(1);

    expect(purpose.amount).toBe("0");
    expect(purpose.distribution).toEqual({
      type: "equal_daily",
      weekdays: [],
      dates: [],
    });
  });

  it("selects weekdays and biweekly dates from the plan start anchor", () => {
    expect(
      getDistributionDates("2026-08-03", "2026-08-03", "2026-08-09", {
        type: "weekdays",
        weekdays: [],
        dates: [],
      }),
    ).toHaveLength(5);
    expect(
      getDistributionDates("2026-08-03", "2026-08-03", "2026-08-24", {
        type: "biweekly",
        weekdays: [1],
        dates: [],
      }),
    ).toEqual(["2026-08-03", "2026-08-17"]);
  });

  it("shows preview count, daily amount, and total for a purpose", () => {
    const purpose = createPurpose(1);
    purpose.name = "Food";
    purpose.amount = "100";
    purpose.distribution = { type: "weekdays", weekdays: [], dates: [] };

    expect(
      getDistributionPreview(purpose, "2026-08-03", "2026-08-03", "2026-08-09"),
    ).toMatchObject({ dayCount: 5, amountPerDay: 20, total: 100 });
  });

  it("requires purpose totals to equal the plan total", () => {
    const purpose = createPurpose(1);
    purpose.name = "Food";
    purpose.amount = "80";
    purpose.category_ids = ["category-1"];

    const errors = getSpendingPlanValidationErrors({
      name: "August plan",
      amount: "100",
      start_date: "2026-08-01",
      end_date: "2026-08-02",
      wallet_ids: ["wallet-1"],
      purposes: [purpose],
    });

    expect(errors.purposes).toBe(
      "ยอดของทุกวัตถุประสงค์รวมกันต้องเท่ากับยอดรวมของแผน",
    );
  });

  it("requires a distribution for legacy purposes before saving a revision", () => {
    const purpose = createPurpose(1);
    purpose.name = "Food";
    purpose.amount = "100";
    purpose.category_ids = ["category-1"];
    purpose.distribution = { type: null, weekdays: [], dates: [] };

    const errors = getSpendingPlanValidationErrors(
      {
        name: "August plan",
        amount: "100",
        start_date: "2026-08-01",
        end_date: "2026-08-02",
        wallet_ids: ["wallet-1"],
        purposes: [purpose],
      },
      { skipPlanAmount: true, windowStart: "2026-08-01", windowEnd: "2026-08-02" },
    );

    expect(errors.distributions).toBe(
      "เลือกวันสำหรับรูปแบบการกระจายของทุกวัตถุประสงค์ให้ครบ",
    );
  });

  it("keeps plan dates as UTC calendar dates", () => {
    expect(getPlanDates("2026-08-01", "2026-08-03")).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });
});
