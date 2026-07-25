import { describe, expect, it } from "vitest";
import { toDateString } from "./date";

describe("dashboard date helpers", () => {
  it("keeps the Bangkok calendar date when converting a selected day", () => {
    expect(toDateString(new Date("2026-07-19T17:00:00.000Z"))).toBe(
      "2026-07-20",
    );
  });
});
