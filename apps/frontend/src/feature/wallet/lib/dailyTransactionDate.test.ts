import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  formatThaiCalendarDate,
  isCalendarDate,
  toUtcDate,
} from "./dailyTransactionDate";

describe("daily transaction dates", () => {
  it("keeps selected calendar dates in UTC without shifting the day", () => {
    expect(toUtcDate("2026-07-20").toISOString().slice(0, 10)).toBe("2026-07-20");
    expect(formatThaiCalendarDate("2026-07-20")).toContain("20");
  });

  it("moves through calendar days across month and year boundaries", () => {
    expect(addCalendarDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addCalendarDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("rejects malformed and impossible dates before updating the URL", () => {
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2026-07-20")).toBe(true);
    expect(isCalendarDate("20-07-2026")).toBe(false);
  });
});
