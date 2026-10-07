import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtTokenService } from '../auth/jwt.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReleaseAnnouncementCatalog } from './release-announcement-catalog';
import { ReleaseAnnouncementController } from './release-announcement.controller';
import { ReleaseAnnouncementStateService } from './release-announcement-state.service';
import type { ReleaseAnnouncement } from './release-announcement.types';

interface AnnouncementState {
  release_id: string;
  seen_at: Date | null;
  dismissed_at: Date | null;
}

interface PopupResponse {
  user_id: string;
  baseline_release_order: number | null;
  announcements: Array<{ id: string; display_state: 'new' | 'seen' }>;
}

const announcements: ReleaseAnnouncement[] = [
  {
    id: 'walpaca-1.1.0',
    version: '1.1.0',
    release_order: 2,
    published_at: '2026-10-02T00:00:00.000Z',
    title: 'อัปเดตล่าสุด',
    summary: 'รายละเอียด',
    updates: {
      features: [{ text: 'ฟีเจอร์ใหม่' }],
      improvements: [],
      fixes: [],
    },
  },
  {
    id: 'walpaca-1.0.0',
    version: '1.0.0',
    release_order: 1,
    published_at: '2026-10-01T00:00:00.000Z',
    title: 'อัปเดตก่อนหน้า',
    summary: 'รายละเอียด',
    updates: {
      features: [],
      improvements: [],
      fixes: [{ text: 'แก้ไขรายการ' }],
    },
  },
];

describe('ReleaseAnnouncementController (HTTP)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const states = new Map<string, AnnouncementState>();
    const baselines = new Map<
      string,
      { baseline_release_id: string; baseline_release_order: number }
    >();
    const stateDelegate = {
      findMany: ({
        where,
      }: {
        where: { user_id: string; release_id: { in: string[] } };
      }) =>
        where.release_id.in.flatMap((releaseId) => {
          const state = states.get(`${where.user_id}:${releaseId}`);
          return state ? [state] : [];
        }),
      createMany: ({
        data,
      }: {
        data: Array<{
          user_id: string;
          release_id: string;
          seen_at?: Date;
          dismissed_at?: Date;
        }>;
      }) => {
        data.forEach((row) => {
          const key = `${row.user_id}:${row.release_id}`;
          if (!states.has(key)) {
            states.set(key, {
              release_id: row.release_id,
              seen_at: row.seen_at ?? null,
              dismissed_at: row.dismissed_at ?? null,
            });
          }
        });
        return { count: data.length };
      },
      updateMany: ({
        where,
        data,
      }: {
        where: {
          user_id: string;
          release_id: { in: string[] };
          seen_at?: null;
          dismissed_at?: null;
        };
        data: { seen_at?: Date; dismissed_at?: Date; updated_at: Date };
      }) => {
        where.release_id.in.forEach((releaseId) => {
          const state = states.get(`${where.user_id}:${releaseId}`);
          if (!state) return;
          if (where.seen_at === null && state.seen_at === null) {
            state.seen_at = data.seen_at ?? null;
          }
          if (where.dismissed_at === null && state.dismissed_at === null) {
            state.dismissed_at = data.dismissed_at ?? null;
          }
        });
        return { count: where.release_id.in.length };
      },
    };
    const transactionClient = {
      release_announcement_user_states: stateDelegate,
    };
    const prisma = {
      users: {
        findUnique: () => ({ session_version: 1 }),
      },
      release_announcement_preferences: {
        upsert: ({
          where,
          create,
        }: {
          where: { user_id: string };
          create: {
            baseline_release_id: string;
            baseline_release_order: number;
          };
        }) => {
          const existing = baselines.get(where.user_id);
          if (existing) return existing;
          const baseline = {
            baseline_release_id: create.baseline_release_id,
            baseline_release_order: create.baseline_release_order,
          };
          baselines.set(where.user_id, baseline);
          return baseline;
        },
        findUnique: ({ where }: { where: { user_id: string } }) =>
          baselines.get(where.user_id) ?? null,
      },
      release_announcement_user_states: stateDelegate,
      $transaction: <T>(
        callback: (tx: typeof transactionClient) => Promise<T>,
      ) => callback(transactionClient),
    };

    const testingModule = await Test.createTestingModule({
      controllers: [ReleaseAnnouncementController],
      providers: [
        JwtAuthGuard,
        ReleaseAnnouncementStateService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtTokenService,
          useValue: {
            verifyAccessToken: (token: string) => ({
              sub: token,
              email: `${token}@example.test`,
              sessionVersion: 1,
            }),
          },
        },
        {
          provide: ReleaseAnnouncementCatalog,
          useValue: { getPublished: () => announcements },
        },
      ],
    }).compile();

    app = testingModule.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication and starts tracking at the latest release', async () => {
    await request(app.getHttpServer())
      .get('/release-announcement/popup')
      .expect(401);

    const response = await request(app.getHttpServer())
      .get('/release-announcement/popup')
      .set('Authorization', 'Bearer user-a')
      .expect(200);
    const body = response.body as PopupResponse;

    expect(body.user_id).toBe('user-a');
    expect(body.baseline_release_order).toBe(2);
    expect(body.announcements.map((item) => item.id)).toEqual([
      'walpaca-1.1.0',
    ]);
  });

  it('keeps seen and dismissal state isolated to the authenticated account', async () => {
    await request(app.getHttpServer())
      .post('/release-announcement/seen')
      .set('Authorization', 'Bearer user-a')
      .send({ release_ids: ['walpaca-1.1.0'] })
      .expect(201, { success: true });
    await request(app.getHttpServer())
      .post('/release-announcement/dismiss')
      .set('Authorization', 'Bearer user-a')
      .send({ release_ids: ['walpaca-1.1.0'] })
      .expect(201, { success: true });

    const userAResponse = await request(app.getHttpServer())
      .get('/release-announcement/popup')
      .set('Authorization', 'Bearer user-a')
      .expect(200);
    const userBResponse = await request(app.getHttpServer())
      .get('/release-announcement/popup')
      .set('Authorization', 'Bearer user-b')
      .expect(200);
    const userABody = userAResponse.body as PopupResponse;
    const userBBody = userBResponse.body as PopupResponse;

    expect(userABody.announcements).toEqual([]);
    expect(userBBody.announcements.map((item) => item.id)).toEqual([
      'walpaca-1.1.0',
    ]);
  });

  it('rejects invalid payloads and user-supplied ownership fields', async () => {
    await request(app.getHttpServer())
      .post('/release-announcement/seen')
      .set('Authorization', 'Bearer user-a')
      .send({ release_ids: ['walpaca-1.1.0', 'walpaca-1.1.0'] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/release-announcement/dismiss')
      .set('Authorization', 'Bearer user-a')
      .send({ release_ids: ['walpaca-1.1.0'], user_id: 'user-b' })
      .expect(400);
  });
});
