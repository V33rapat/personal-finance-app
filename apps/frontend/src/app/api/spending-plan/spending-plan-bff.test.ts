import { describe, expect, it } from "vitest";
import {
  toBackendSpendingPlanCreateBody,
  toBackendSpendingPlanPreferencesBody,
  toBackendSpendingPlanUpdateBody,
} from "./spending-plan-bff";

describe("spending plan BFF payload", () => {
  it("allows only the planned create fields and normalizes nested values", () => {
    expect(
      toBackendSpendingPlanCreateBody({
        name: "  July plan  ",
        amount: "1200.50",
        startDate: "2026-08-01",
        endDate: "2026-08-07",
        walletIds: ["wallet-1"],
        purposes: [
          {
            name: " Food ",
            categoryIds: ["category-1"],
            amount: "180",
            distribution: {
              type: "specific_dates",
              weekdays: [1, 5],
              dates: ["2026-08-01"],
            },
            allocations: [{ date: "2026-08-01", amount: "999" }],
          },
        ],
        user_id: "must-not-reach-backend",
      }),
    ).toEqual({
      name: "July plan",
      amount: 1200.5,
      start_date: "2026-08-01",
      end_date: "2026-08-07",
      wallet_ids: ["wallet-1"],
      purposes: [
        {
          name: "Food",
          category_ids: ["category-1"],
          amount: 180,
          distribution: {
            type: "specific_dates",
            weekdays: [1, 5],
            dates: ["2026-08-01"],
          },
        },
      ],
    });
  });

  it("keeps revision and display preference payloads on separate allow-lists", () => {
    expect(
      toBackendSpendingPlanUpdateBody({
        effective_date: "2026-08-03",
        amount: 999,
        wallet_ids: ["wallet-1"],
        purposes: [],
        start_date: "not-allowed-on-update",
      }),
    ).toEqual({
      name: undefined,
      effective_date: "2026-08-03",
      wallet_ids: ["wallet-1"],
      purposes: [],
    });
    expect(
      toBackendSpendingPlanPreferencesBody({
        lastView: "range",
        showDailyBalance: false,
        visiblePurposeNames: ["Food"],
        walletIds: ["not-allowed"],
      }),
    ).toEqual({
      last_view: "range",
      show_daily_balance: false,
      visible_purpose_names: ["Food"],
    });
  });
});
