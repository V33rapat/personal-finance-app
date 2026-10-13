import { describe, expect, it } from "vitest";
import {
  formatMonthName,
  formatMonthValue,
  isMonthAfter,
  parseMonthValue,
  toMonthValue,
} from "./dashboardMonth";

describe("dashboard month formatting", () => {
  it("formats the same month using the requested locale", () => {
    expect(formatMonthValue("2026-07", "th-TH")).toBe("กรกฎาคม 2569");
    expect(formatMonthValue("2026-07", "en-US")).toBe("July 2026");
  });

  it("formats month names for the picker using the requested locale", () => {
    expect(formatMonthName(7, "th-TH")).toBe("กรกฎาคม");
    expect(formatMonthName(7, "en-US")).toBe("July");
  });

  it("parses valid month values and rejects malformed values", () => {
    expect(parseMonthValue("2026-07")).toEqual({ year: 2026, month: 7 });
    expect(parseMonthValue("2026-13")).toBeNull();
    expect(parseMonthValue("07/2026")).toBeNull();
  });

  it("keeps the YYYY-MM value stable and detects months after the maximum", () => {
    expect(toMonthValue(2026, 7)).toBe("2026-07");
    expect(isMonthAfter("2026-08", "2026-07")).toBe(true);
    expect(isMonthAfter("2026-07", "2026-07")).toBe(false);
  });
});
