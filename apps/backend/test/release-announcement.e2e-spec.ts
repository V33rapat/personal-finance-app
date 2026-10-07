import { resolve } from 'node:path';
import request from 'supertest';
import {
  bearerToken,
  cleanupE2eUsers,
  createE2eContext,
  createE2eUser,
  type E2eContext,
  type E2eUser,
} from './e2e-test-utils';

interface AnnouncementResponse {
  baseline_release_order: number | null;
  announcements: Array<{
    id: string;
    display_state: 'new' | 'seen';
    seen_at: string | null;
    dismissed_at: string | null;
  }>;
}

describe('Release announcements API (e2e)', () => {
  let context: E2eContext;
  let users: E2eUser[] = [];
  const previousCatalogPath =
    process.env.RELEASE_ANNOUNCEMENT_TEST_CATALOG_PATH;

  beforeAll(async () => {
    process.env.RELEASE_ANNOUNCEMENT_TEST_CATALOG_PATH = resolve(
      __dirname,
      'fixtures/release-announcements.json',
    );
    context = await createE2eContext();
  });

  afterAll(async () => {
    if (previousCatalogPath === undefined) {
      delete process.env.RELEASE_ANNOUNCEMENT_TEST_CATALOG_PATH;
    } else {
      process.env.RELEASE_ANNOUNCEMENT_TEST_CATALOG_PATH = previousCatalogPath;
    }
    await context.app.close();
  });

  beforeEach(async () => {
    users = [
      await createE2eUser(context, 'Release User A'),
      await createE2eUser(context, 'Release User B'),
    ];
  });

  afterEach(async () => {
    await cleanupE2eUsers(
      context.prisma,
      users.map((user) => user.id),
    );
    users = [];
  });

  it('does not initialize history baseline and initializes new users at the latest published release', async () => {
    const [userA] = users;
    const history = await request(context.app.getHttpServer())
      .get('/release-announcement/history')
      .set('Authorization', bearerToken(userA))
      .expect(200);

    expect(
      (history.body as AnnouncementResponse).baseline_release_order,
    ).toBeNull();
    expect(
      await context.prisma.release_announcement_preferences.findUnique({
        where: { user_id: userA.id },
      }),
    ).toBeNull();

    const popup = await request(context.app.getHttpServer())
      .get('/release-announcement/popup')
      .set('Authorization', bearerToken(userA))
      .expect(200);
    const popupBody = popup.body as AnnouncementResponse;

    expect(popupBody.baseline_release_order).toBe(3);
    expect(popupBody.announcements.map(({ id }) => id)).toEqual([
      'walpaca-1.2.0',
    ]);

    const historyAfterInitialization = await request(
      context.app.getHttpServer(),
    )
      .get('/release-announcement/history')
      .set('Authorization', bearerToken(userA))
      .expect(200);
    expect(
      (
        historyAfterInitialization.body as AnnouncementResponse
      ).announcements.map(({ id }) => id),
    ).toEqual(['walpaca-1.2.0', 'walpaca-1.1.0', 'walpaca-1.0.0']);
  });

  it('persists seen and dismissed states for one account without changing another account', async () => {
    const [userA, userB] = users;
    await request(context.app.getHttpServer())
      .get('/release-announcement/popup')
      .set('Authorization', bearerToken(userA))
      .expect(200);
    await request(context.app.getHttpServer())
      .get('/release-announcement/popup')
      .set('Authorization', bearerToken(userB))
      .expect(200);

    await request(context.app.getHttpServer())
      .post('/release-announcement/seen')
      .set('Authorization', bearerToken(userA))
      .send({ release_ids: ['walpaca-1.0.0'] })
      .expect(201, { success: true });
    await request(context.app.getHttpServer())
      .post('/release-announcement/dismiss')
      .set('Authorization', bearerToken(userA))
      .send({ release_ids: ['walpaca-1.2.0'] })
      .expect(201, { success: true });

    const persistedStates =
      await context.prisma.release_announcement_user_states.findMany({
        where: { user_id: userA.id },
        orderBy: { release_id: 'asc' },
      });
    expect(persistedStates).toHaveLength(2);
    expect(
      persistedStates.find(({ release_id }) => release_id === 'walpaca-1.0.0')
        ?.seen_at,
    ).toBeInstanceOf(Date);
    expect(
      persistedStates.find(({ release_id }) => release_id === 'walpaca-1.2.0')
        ?.seen_at,
    ).toBeNull();
    expect(
      persistedStates.find(({ release_id }) => release_id === 'walpaca-1.2.0')
        ?.dismissed_at,
    ).toBeInstanceOf(Date);

    const [popupA, popupB] = await Promise.all([
      request(context.app.getHttpServer())
        .get('/release-announcement/popup')
        .set('Authorization', bearerToken(userA)),
      request(context.app.getHttpServer())
        .get('/release-announcement/popup')
        .set('Authorization', bearerToken(userB)),
    ]);
    expect(popupA.status).toBe(200);
    expect((popupA.body as AnnouncementResponse).announcements).toEqual([]);
    expect(popupB.status).toBe(200);
    expect(
      (popupB.body as AnnouncementResponse).announcements.map(({ id }) => id),
    ).toEqual(['walpaca-1.2.0']);
    expect(
      await context.prisma.release_announcement_user_states.findMany({
        where: { user_id: userB.id },
      }),
    ).toEqual([]);
  });

  it('requires a token and rejects duplicate, unknown, or user-owned release state payloads', async () => {
    const [userA] = users;
    await request(context.app.getHttpServer())
      .get('/release-announcement/history')
      .expect(401);
    await request(context.app.getHttpServer())
      .post('/release-announcement/seen')
      .set('Authorization', bearerToken(userA))
      .send({ release_ids: ['walpaca-1.0.0', 'walpaca-1.0.0'] })
      .expect(400);
    await request(context.app.getHttpServer())
      .post('/release-announcement/seen')
      .set('Authorization', bearerToken(userA))
      .send({ release_ids: ['walpaca-1.0.0'], user_id: users[1].id })
      .expect(400);
    await request(context.app.getHttpServer())
      .post('/release-announcement/seen')
      .set('Authorization', bearerToken(userA))
      .send({ release_ids: ['does-not-exist'] })
      .expect(404);
  });
});
