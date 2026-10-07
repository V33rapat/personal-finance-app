export type ReleaseUpdateKind = 'features' | 'improvements' | 'fixes';

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
}

