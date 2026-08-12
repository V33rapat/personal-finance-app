import { describe, expect, it } from "vitest";
import {
  createPurpose,
  getPlanDates,
  getSpendingPlanValidationErrors,
  synchronizePlanAllocations,
} from "./spendingPlan";

describe("spending plan form helpers", () => {
  it("keeps one allocation cell for every day in a plan", () => {
    const dates = getPlanDates("2026-08-01", "2026-08-03");
    const values = synchronizePlanAllocations({
      name: "August plan",
      amount: "300",
      start_date: "2026-08-01",
      end_date: "2026-08-03",
      wallet_ids: ["wallet-1"],
      purposes: [createPurpose(dates.slice(0, 1), 1)],
    });

    expect(values.purposes[0].allocations).toHaveLength(3);
    expect(values.purposes[0].allocations.map((item) => item.date)).toEqual(dates);
  });

  it("requires the complete allocation grid to match the plan total", () => {
    const dates = getPlanDates("2026-08-01", "2026-08-02");
    const purpose = createPurpose(dates, 1);
    purpose.name = "Food";
    purpose.category_ids = ["category-1"];
    purpose.allocations[0].amount = "80";
    purpose.allocations[1].amount = "100";

    expect(
      getSpendingPlanValidationErrors({
        name: "August plan",
        amount: "200",
        start_date: "2026-08-01",
        end_date: "2026-08-02",
        wallet_ids: ["wallet-1"],
        purposes: [purpose],
      }).allocations,
    ).toBe("ยอดจัดสรรทุกช่องรวมกันต้องเท่ากับยอดรวมของแผน");
  });

  it("does not require a client-supplied plan amount when saving a revision", () => {
    const dates = getPlanDates("2026-08-01", "2026-08-02");
    const purpose = createPurpose(dates, 1);
    purpose.name = "Food";
    purpose.category_ids = ["category-1"];

    expect(
      getSpendingPlanValidationErrors(
        {
          name: "August plan",
          amount: "not-used-for-revision",
          start_date: "2026-08-01",
          end_date: "2026-08-02",
          wallet_ids: ["wallet-1"],
          purposes: [purpose],
        },
        { skipPlanAmount: true },
      ),
    ).not.toHaveProperty("amount");
  });
});
