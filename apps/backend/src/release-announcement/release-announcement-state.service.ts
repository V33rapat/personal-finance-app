import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReleaseAnnouncementCatalog } from './release-announcement-catalog';
import type { ReleaseAnnouncement } from './release-announcement.types';

const MAX_RELEASE_IDS_PER_REQUEST = 100;

interface AnnouncementUserState {
  release_id: string;
  seen_at: Date | null;
  dismissed_at: Date | null;
}

interface AnnouncementStateResponse extends ReleaseAnnouncement {
  seen_at: Date | null;
  dismissed_at: Date | null;
  display_state: 'new' | 'seen';
}

export interface ReleaseAnnouncementPopupResponse {
  user_id: string;
  baseline_release_order: number | null;
  announcements: AnnouncementStateResponse[];
}

export interface ReleaseAnnouncementHistoryResponse {
  baseline_release_order: number | null;
  announcements: AnnouncementStateResponse[];
}

@Injectable()
export class ReleaseAnnouncementStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: ReleaseAnnouncementCatalog,
  ) {}

  async getPopup(userId: string): Promise<ReleaseAnnouncementPopupResponse> {
    const releases = this.catalog.getPublished();
    if (releases.length === 0) {
      return {
        user_id: userId,
        baseline_release_order: null,
        announcements: [],
      };
    }

    const baseline = await this.prisma.release_announcement_preferences.upsert({
      where: { user_id: userId },
      update: {},
      create: {
        user_id: userId,
        baseline_release_id: releases[0].id,
        baseline_release_order: releases[0].release_order,
      },
    });

    const inScope = releases.filter(
      (release) => release.release_order >= baseline.baseline_release_order,
    );
    const states = await this.findUserStates(userId, inScope);
    const stateById = new Map(states.map((state) => [state.release_id, state]));

    return {
      user_id: userId,
      baseline_release_order: baseline.baseline_release_order,
      announcements: inScope
        .filter((release) => !stateById.get(release.id)?.dismissed_at)
        .map((release) => this.toResponse(release, stateById.get(release.id))),
    };
  }

  async getHistory(
    userId: string,
  ): Promise<ReleaseAnnouncementHistoryResponse> {
    const releases = this.catalog.getPublished();
    const [baseline, states] = await Promise.all([
      this.prisma.release_announcement_preferences.findUnique({
        where: { user_id: userId },
      }),
      this.findUserStates(userId, releases),
    ]);
    const stateById = new Map(states.map((state) => [state.release_id, state]));

    return {
      baseline_release_order: baseline?.baseline_release_order ?? null,
      announcements: releases.map((release) =>
        this.toResponse(release, stateById.get(release.id)),
      ),
    };
  }

  async markSeen(userId: string, releaseIds: string[]): Promise<void> {
    const releases = this.validateReleaseIds(releaseIds);
    const seenAt = new Date();

    await this.prisma.$transaction(async (transaction) => {
      await transaction.release_announcement_user_states.createMany({
        data: releases.map((release) => ({
          user_id: userId,
          release_id: release.id,
          seen_at: seenAt,
        })),
        skipDuplicates: true,
      });
      await transaction.release_announcement_user_states.updateMany({
        where: {
          user_id: userId,
          release_id: { in: releases.map((release) => release.id) },
          seen_at: null,
        },
        data: { seen_at: seenAt, updated_at: seenAt },
      });
    });
  }

  async dismiss(userId: string, releaseIds: string[]): Promise<void> {
    const releases = this.validateReleaseIds(releaseIds);
    const baseline =
      await this.prisma.release_announcement_preferences.findUnique({
        where: { user_id: userId },
      });

    if (
      !baseline ||
      releases.some(
        (release) => release.release_order < baseline.baseline_release_order,
      )
    ) {
      throw new BadRequestException(
        'ประกาศบางรายการอยู่นอกช่วงที่สามารถซ่อนได้',
      );
    }

    const dismissedAt = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.release_announcement_user_states.createMany({
        data: releases.map((release) => ({
          user_id: userId,
          release_id: release.id,
          dismissed_at: dismissedAt,
        })),
        skipDuplicates: true,
      });
      await transaction.release_announcement_user_states.updateMany({
        where: {
          user_id: userId,
          release_id: { in: releases.map((release) => release.id) },
          dismissed_at: null,
        },
        data: { dismissed_at: dismissedAt, updated_at: dismissedAt },
      });
    });
  }

  private async findUserStates(
    userId: string,
    releases: ReleaseAnnouncement[],
  ): Promise<AnnouncementUserState[]> {
    if (releases.length === 0) return [];

    return this.prisma.release_announcement_user_states.findMany({
      where: {
        user_id: userId,
        release_id: { in: releases.map((release) => release.id) },
      },
      select: { release_id: true, seen_at: true, dismissed_at: true },
    });
  }

  private validateReleaseIds(releaseIds: string[]): ReleaseAnnouncement[] {
    if (
      !Array.isArray(releaseIds) ||
      releaseIds.length === 0 ||
      releaseIds.length > MAX_RELEASE_IDS_PER_REQUEST ||
      new Set(releaseIds).size !== releaseIds.length
    ) {
      throw new BadRequestException('รายการเวอร์ชั่นไม่ถูกต้อง');
    }

    const releases = this.catalog.getPublished();
    const releasesById = new Map(
      releases.map((release) => [release.id, release]),
    );
    const selected = releaseIds.map((id) => releasesById.get(id));

    if (selected.some((release) => !release)) {
      throw new NotFoundException('ไม่พบประกาศเวอร์ชั่นที่ระบุ');
    }

    return selected as ReleaseAnnouncement[];
  }

  private toResponse(
    release: ReleaseAnnouncement,
    state?: AnnouncementUserState,
  ): AnnouncementStateResponse {
    return {
      ...release,
      seen_at: state?.seen_at ?? null,
      dismissed_at: state?.dismissed_at ?? null,
      display_state: state?.seen_at ? 'seen' : 'new',
    };
  }
}
