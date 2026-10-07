import { describe, expect, it } from "vitest";
import {
  formatAnnouncementText,
  getAnnouncementGroups,
  getVisiblePopupAnnouncements,
} from "./releaseAnnouncement";
import type { ReleaseAnnouncement } from "../types";

const makeRelease = (
  id: string,
  display_state: "new" | "seen",
  dismissed_at: string | null = null,
): ReleaseAnnouncement => ({
  id,
  version: id,
  release_order: 1,
  published_at: "2026-10-01T00:00:00.000Z",
  title: id,
  summary: "Summary",
  updates: { features: [{ text: "Update" }], improvements: [], fixes: [] },
  seen_at: display_state === "seen" ? "2026-10-01T00:00:00.000Z" : null,
  dismissed_at,
  display_state,
});

describe("release announcement helpers", () => {
  it("separates new and seen releases and optionally keeps dismissed history", () => {
    const releases = [
      makeRelease("new", "new"),
      makeRelease("seen", "seen"),
      makeRelease("dismissed", "seen", "2026-10-02T00:00:00.000Z"),
    ];

    expect(getAnnouncementGroups(releases).map(({ key }) => key)).toEqual([
      "new",
      "seen",
    ]);
    expect(getAnnouncementGroups(releases, true).map(({ key }) => key)).toEqual([
      "new",
      "seen",
      "dismissed",
    ]);
  });

  it("hides dismissed and current-tab suppressed releases from the popup", () => {
    const releases = [
      makeRelease("visible", "new"),
      makeRelease("suppressed", "new"),
      makeRelease("dismissed", "seen", "2026-10-02T00:00:00.000Z"),
    ];

    expect(getVisiblePopupAnnouncements(releases, ["suppressed"]).map(({ id }) => id)).toEqual([
      "visible",
    ]);
  });

  it("formats a release version into an accessible label", () => {
    expect(formatAnnouncementText("ดูรายละเอียดเวอร์ชัน %s", "2.4.0")).toBe(
      "ดูรายละเอียดเวอร์ชัน 2.4.0",
    );
  });
});
