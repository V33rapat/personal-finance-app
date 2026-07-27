import { describe, expect, it } from "vitest";
import {
  toBackendSpendingBudgetCreateBody,
  toBackendSpendingBudgetUpdateBody,
} from "./spending-budget-bff";

describe("spending budget BFF payload", () => {
  it("maps camelCase wallet scope fields through the create allow-list", () => {
    const body = {
      name: "ค่าอาหาร",
      amount: "180",
      period: "daily",
      categoryIds: ["category-id"],
      includesUncategorized: false,
      walletScope: "selected",
      walletIds: ["wallet-a", "wallet-b"],
      unexpected: "must-not-reach-backend",
    };

    expect(toBackendSpendingBudgetCreateBody(body)).toEqual({
      name: "ค่าอาหาร",
      amount: 180,
      period: "daily",
      category_ids: ["category-id"],
      includes_uncategorized: false,
      wallet_scope: "selected",
      wallet_ids: ["wallet-a", "wallet-b"],
    });
  });

  it("accepts snake_case wallet scope fields through the update allow-list", () => {
    expect(
      toBackendSpendingBudgetUpdateBody({
        wallet_scope: "all",
        wallet_ids: [],
        is_active: true,
      }),
    ).toEqual({
      name: undefined,
      amount: undefined,
      period: undefined,
      category_ids: undefined,
      includes_uncategorized: undefined,
      wallet_scope: "all",
      wallet_ids: [],
      is_active: true,
    });
  });
});
