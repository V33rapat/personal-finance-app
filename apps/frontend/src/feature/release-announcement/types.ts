export type ReleaseUpdateKind = "features" | "improvements" | "fixes";
export type ReleaseDisplayState = "new" | "seen";

export interface ReleaseUpdateItem {
  text: string;
  href?: string;
}

export interface ReleaseAnnouncement {
  id: string;
  version: string;
  release_order: number;
  published_at: string;
  title: string;
  summary: string;
  updates: Record<ReleaseUpdateKind, ReleaseUpdateItem[]>;
  seen_at: string | null;
  dismissed_at: string | null;
  display_state: ReleaseDisplayState;
}

export interface ReleaseAnnouncementPopupResponse {
  user_id: string;
  baseline_release_order: number | null;
  announcements: ReleaseAnnouncement[];
}

export interface ReleaseAnnouncementHistoryResponse {
  baseline_release_order: number | null;
  announcements: ReleaseAnnouncement[];
}
