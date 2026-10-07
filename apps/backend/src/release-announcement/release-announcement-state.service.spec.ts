import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReleaseAnnouncementCatalog } from './release-announcement-catalog';
import { ReleaseAnnouncementStateService } from './release-announcement-state.service';
import type { ReleaseAnnouncement } from './release-announcement.types';

interface ReleaseStateCreate {
  user_id: string;
  release_id: string;
  seen_at?: Date;
  dismissed_at?: Date;
}

interface ReleaseStateUpdate {
  where: {
    user_id: string;
    release_id: { in: string[] };
    seen_at?: null;
    dismissed_at?: null;
  };
  data: {
    seen_at?: Date;
    dismissed_at?: Date;
    updated_at: Date;
  };
}

interface ReleaseStateRecord {
  release_id: string;
  seen_at: Date | null;
  dismissed_at: Date | null;
}

interface BaselineRecord {
  baseline_release_id?: string;
  baseline_release_order: number;
}

interface BaselineUpsertInput {
  where: { user_id: string };
  update: Record<string, never>;
  create: { user_id: string } & Required<BaselineRecord>;
}

interface StateCreateManyInput {
  data: ReleaseStateCreate[];
  skipDuplicates: boolean;
}

const releases: ReleaseAnnouncement[] = [
  {
    id: 'walpaca-1.2.0',
    version: '1.2.0',
    release_order: 3,
    published_at: '2026-10-03T00:00:00.000Z',
    title: 'เวอร์ชั่นใหม่',
    summary: 'สรุปเวอร์ชั่นใหม่',
    updates: {
      features: [{ text: 'เพิ่มฟีเจอร์' }],
      improvements: [],
      fixes: [],
    },
  },
  {
    id: 'walpaca-1.1.0',
    version: '1.1.0',
    release_order: 2,
    published_at: '2026-10-02T00:00:00.000Z',
    title: 'เวอร์ชั่นก่อน',
    summary: 'สรุปเวอร์ชั่นก่อน',
    updates: { features: [], improvements: [{ text: 'ปรับปรุง' }], fixes: [] },
  },
  {
    id: 'walpaca-1.0.0',
    version: '1.0.0',
    release_order: 1,
    published_at: '2026-10-01T00:00:00.000Z',
    title: 'เริ่มต้น',
    summary: 'สรุปเริ่มต้น',
    updates: { features: [], improvements: [], fixes: [{ text: 'แก้บัค' }] },
  },
];

describe('ReleaseAnnouncementStateService', () => {
  let service: ReleaseAnnouncementStateService;
  let prisma: {
    $transaction: jest.Mock;
    release_announcement_preferences: {
      upsert: jest.Mock<Promise<BaselineRecord>, [BaselineUpsertInput]>;
      findUnique: jest.Mock<Promise<BaselineRecord | null>, [unknown]>;
    };
    release_announcement_user_states: {
      findMany: jest.Mock<Promise<ReleaseStateRecord[]>, [unknown]>;
      createMany: jest.Mock<Promise<{ count: number }>, [StateCreateManyInput]>;
      updateMany: jest.Mock<Promise<{ count: number }>, [ReleaseStateUpdate]>;
    };
  };
  let transaction: {
    release_announcement_user_states: {
      createMany: jest.Mock<Promise<{ count: number }>, [StateCreateManyInput]>;
      updateMany: jest.Mock<Promise<{ count: number }>, [ReleaseStateUpdate]>;
    };
  };
  let catalog: Pick<ReleaseAnnouncementCatalog, 'getPublished'>;

  beforeEach(() => {
    transaction = {
      release_announcement_user_states: {
        createMany: jest
          .fn<Promise<{ count: number }>, [StateCreateManyInput]>()
          .mockResolvedValue({ count: 1 }),
        updateMany: jest
          .fn<Promise<{ count: number }>, [ReleaseStateUpdate]>()
          .mockResolvedValue({ count: 1 }),
      },
    };
    prisma = {
      $transaction: jest.fn(
        async <T>(callback: (tx: typeof transaction) => Promise<T>) =>
          callback(transaction),
      ),
      release_announcement_preferences: {
        upsert: jest.fn<Promise<BaselineRecord>, [BaselineUpsertInput]>(),
        findUnique: jest.fn<Promise<BaselineRecord | null>, [unknown]>(),
      },
      release_announcement_user_states: {
        findMany: jest
          .fn<Promise<ReleaseStateRecord[]>, [unknown]>()
          .mockResolvedValue([]),
        createMany: jest.fn<
          Promise<{ count: number }>,
          [StateCreateManyInput]
        >(),
        updateMany: jest.fn<Promise<{ count: number }>, [ReleaseStateUpdate]>(),
      },
    };
    catalog = { getPublished: jest.fn().mockReturnValue(releases) };
    service = new ReleaseAnnouncementStateService(
      prisma as unknown as PrismaService,
      catalog as ReleaseAnnouncementCatalog,
    );
  });

  it('does not create a baseline when no release has been published', async () => {
    jest.mocked(catalog.getPublished).mockReturnValue([]);

    await expect(service.getPopup('user-a')).resolves.toEqual({
      user_id: 'user-a',
      baseline_release_order: null,
      announcements: [],
    });
    expect(
      prisma.release_announcement_preferences.upsert,
    ).not.toHaveBeenCalled();
  });

  it('sets a first-time baseline to the latest release and excludes older ones', async () => {
    prisma.release_announcement_preferences.upsert.mockResolvedValue({
      baseline_release_id: 'walpaca-1.2.0',
      baseline_release_order: 3,
    });

    const result = await service.getPopup('user-a');

    expect(prisma.release_announcement_preferences.upsert).toHaveBeenCalledWith(
      {
        where: { user_id: 'user-a' },
        update: {},
        create: {
          user_id: 'user-a',
          baseline_release_id: 'walpaca-1.2.0',
          baseline_release_order: 3,
        },
      },
    );
    expect(result.announcements.map((item) => item.id)).toEqual([
      'walpaca-1.2.0',
    ]);
  });

  it('keeps an existing baseline and includes every later release', async () => {
    prisma.release_announcement_preferences.upsert.mockResolvedValue({
      baseline_release_id: 'walpaca-1.1.0',
      baseline_release_order: 2,
    });
    prisma.release_announcement_user_states.findMany.mockResolvedValue([
      {
        release_id: 'walpaca-1.1.0',
        seen_at: new Date('2026-10-04T00:00:00.000Z'),
        dismissed_at: null,
      },
      {
        release_id: 'walpaca-1.2.0',
        seen_at: null,
        dismissed_at: new Date('2026-10-05T00:00:00.000Z'),
      },
    ]);

    const result = await service.getPopup('user-a');

    const upsertInput =
      prisma.release_announcement_preferences.upsert.mock.calls[0][0];
    expect(upsertInput.create.baseline_release_order).toBe(3);
    expect(result.baseline_release_order).toBe(2);
    expect(result.announcements).toHaveLength(1);
    expect(result.announcements[0]).toMatchObject({
      id: 'walpaca-1.1.0',
      display_state: 'seen',
    });
  });

  it('returns history without initializing a baseline and includes dismissed releases', async () => {
    prisma.release_announcement_preferences.findUnique.mockResolvedValue(null);
    prisma.release_announcement_user_states.findMany.mockResolvedValue([
      {
        release_id: 'walpaca-1.0.0',
        seen_at: null,
        dismissed_at: new Date('2026-10-05T00:00:00.000Z'),
      },
    ]);

    const result = await service.getHistory('user-a');

    expect(result.announcements).toHaveLength(3);
    expect(result.announcements[0].display_state).toBe('new');
    expect(result.announcements[2].dismissed_at).not.toBeNull();
    expect(
      prisma.release_announcement_preferences.upsert,
    ).not.toHaveBeenCalled();
  });

  it('writes seen state idempotently inside one transaction', async () => {
    await service.markSeen('user-a', ['walpaca-1.2.0', 'walpaca-1.1.0']);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const seenCreateInput =
      transaction.release_announcement_user_states.createMany.mock.calls[0][0];
    expect(seenCreateInput.skipDuplicates).toBe(true);
    expect(seenCreateInput.data.map((item) => item.release_id)).toEqual([
      'walpaca-1.2.0',
      'walpaca-1.1.0',
    ]);
    expect(
      seenCreateInput.data.every(
        (item) => item.user_id === 'user-a' && item.seen_at instanceof Date,
      ),
    ).toBe(true);
    const seenUpdateInput =
      transaction.release_announcement_user_states.updateMany.mock.calls[0][0];
    expect(seenUpdateInput.where.seen_at).toBeNull();
  });

  it('dismisses the entire requested batch atomically without marking it seen', async () => {
    prisma.release_announcement_preferences.findUnique.mockResolvedValue({
      baseline_release_order: 2,
    });

    await service.dismiss('user-a', ['walpaca-1.2.0', 'walpaca-1.1.0']);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const dismissCreateInput =
      transaction.release_announcement_user_states.createMany.mock.calls[0][0];
    expect(dismissCreateInput.skipDuplicates).toBe(true);
    expect(dismissCreateInput.data.map((item) => item.release_id)).toEqual([
      'walpaca-1.2.0',
      'walpaca-1.1.0',
    ]);
    expect(
      dismissCreateInput.data.every(
        (item) =>
          item.dismissed_at instanceof Date && item.seen_at === undefined,
      ),
    ).toBe(true);
    const dismissUpdateInput =
      transaction.release_announcement_user_states.updateMany.mock.calls[0][0];
    expect(dismissUpdateInput.where.dismissed_at).toBeNull();
  });

  it('rejects duplicate, unknown, and out-of-scope release IDs', async () => {
    await expect(service.markSeen('user-a', [])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.markSeen('user-a', ['walpaca-1.2.0', 'walpaca-1.2.0']),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.markSeen('user-a', ['walpaca-9.9.9']),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.release_announcement_preferences.findUnique.mockResolvedValue({
      baseline_release_order: 2,
    });
    await expect(
      service.dismiss('user-a', ['walpaca-1.0.0']),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
