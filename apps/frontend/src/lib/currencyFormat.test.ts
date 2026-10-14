import { describe, expect, it } from "vitest";
import { formatCurrency, formatMoneyAmount } from "./currencyFormat";

describe("currency formatting", () => {
  it("always displays two fractional digits", () => {
    expect(formatMoneyAmount(100)).toBe("100.00");
    expect(formatMoneyAmount("100.5")).toBe("100.50");
    expect(formatMoneyAmount("100.01")).toBe("100.01");
    expect(formatMoneyAmount(0)).toBe("0.00");
  });

  it("preserves grouping, negative values, and the requested currency", () => {
    expect(formatMoneyAmount("1234.5")).toBe("1,234.50");
    expect(formatMoneyAmount("-1234.5")).toBe("-1,234.50");
    expect(formatCurrency("1234.5", "USD")).toContain("1,234.50");
    expect(formatCurrency("1234.5", "USD")).toContain("$");
  });
});
