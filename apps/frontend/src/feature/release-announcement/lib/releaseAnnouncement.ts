import type { ReleaseAnnouncement } from "../types";

export interface ReleaseAnnouncementGroup {
  key: "new" | "seen" | "dismissed";
  announcements: ReleaseAnnouncement[];
}

export function getAnnouncementGroups(
  announcements: ReleaseAnnouncement[],
  includeDismissed = false,
): ReleaseAnnouncementGroup[] {
  const groups: ReleaseAnnouncementGroup[] = [
    {
      key: "new",
      announcements: announcements.filter(
        (announcement) =>
          announcement.display_state === "new" && !announcement.dismissed_at,
      ),
    },
    {
      key: "seen",
      announcements: announcements.filter(
        (announcement) =>
          announcement.display_state === "seen" && !announcement.dismissed_at,
      ),
    },
  ];

  if (includeDismissed) {
    groups.push({
      key: "dismissed",
      announcements: announcements.filter(
        (announcement) => Boolean(announcement.dismissed_at),
      ),
    });
  }

  return groups.filter((group) => group.announcements.length > 0);
}

export function getVisiblePopupAnnouncements(
  announcements: ReleaseAnnouncement[],
  suppressedIds: string[],
): ReleaseAnnouncement[] {
  const suppressed = new Set(suppressedIds);
  return announcements.filter(
    (announcement) =>
      !announcement.dismissed_at && !suppressed.has(announcement.id),
  );
}

export function formatReleaseDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatAnnouncementText(
  template: string,
  value: string,
): string {
  return template.replace("%s", value);
}
