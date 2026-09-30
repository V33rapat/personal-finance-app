import { describe, expect, it } from "vitest";
import {
  formatCompactDate,
  formatDateDraft,
  formatDateInput,
  formatDisplayDate,
  formatDisplayDateRange,
  getDateDraftCaretPosition,
  isValidIsoDate,
  parseDisplayDate,
} from "./dateFormat";

describe("date format helpers", () => {
  it("formats ISO dates as DD/MM/YYYY and parses them back", () => {
    expect(formatDateInput("2026-09-18")).toBe("18/09/2026");
    expect(parseDisplayDate("18/09/2026")).toBe("2026-09-18");
    expect(parseDisplayDate("18092026")).toBe("2026-09-18");
  });

  it("rejects invalid dates and validates leap days", () => {
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(parseDisplayDate("31/04/2026")).toBeNull();
    expect(parseDisplayDate("18/13/2026")).toBeNull();
    expect(parseDisplayDate("1/9/2026")).toBeNull();
    expect(formatDateInput("not-a-date")).toBe("");
  });

  it("adds separators as digits are entered and maps the caret", () => {
    expect(formatDateDraft("18092026")).toBe("18/09/2026");
    expect(formatDateDraft("18/09/2026")).toBe("18/09/2026");
    expect(getDateDraftCaretPosition("18/09/2026", 2)).toBe(3);
    expect(getDateDraftCaretPosition("18/09/2026", 4)).toBe(6);
  });

  it("formats full and compact labels without changing the ISO day", () => {
    expect(formatDisplayDate("2026-09-18")).toBe("18/09/2026");
    expect(formatCompactDate("2026-09-18")).toBe("18/09");
    expect(formatDisplayDateRange("2026-09-18", "2026-09-18")).toBe("18/09/2026");
    expect(formatDisplayDateRange("2026-09-18", "2026-09-20")).toBe(
      "18/09/2026 - 20/09/2026"
    );
  });

  it("formats timestamps using the Bangkok calendar day", () => {
    expect(formatDisplayDate("2026-09-17T20:15:00.000Z")).toBe("18/09/2026");
    expect(formatDisplayDate("2026-12-31T20:00:00.000Z")).toBe("01/01/2027");
  });
});
