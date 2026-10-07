import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getReleaseAnnouncements,
  updateReleaseAnnouncementState,
} from './release-announcement-bff';

const cookiesMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({ cookies: cookiesMock }));

function createPostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/release-announcement/seen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('release-announcement BFF', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://backend.example.com/';
    cookiesMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('forwards authenticated popup requests without caching', async () => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: 'access-token' }) });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ announcements: [] }), { status: 200 }),
    );

    const response = await getReleaseAnnouncements('popup');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.example.com/release-announcement/popup',
      {
        headers: { Authorization: 'Bearer access-token' },
        cache: 'no-store',
      },
    );
  });

  it('returns 401 without contacting the Backend when the user is signed out', async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });

    const response = await getReleaseAnnouncements('history');

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards only release_ids to the requested state endpoint', async () => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: 'access-token' }) });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 201 }),
    );

    const response = await updateReleaseAnnouncementState(
      'dismiss',
      createPostRequest({
        release_ids: ['walpaca-1.2.0'],
        user_id: 'must-not-reach-backend',
        ignored: true,
      }),
    );

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.example.com/release-announcement/dismiss',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ release_ids: ['walpaca-1.2.0'] }),
        cache: 'no-store',
      },
    );
  });

  it.each([
    ['empty IDs', { release_ids: [] }],
    ['duplicate IDs', { release_ids: ['walpaca-1.0.0', 'walpaca-1.0.0'] }],
    ['invalid ID', { release_ids: ['https://example.com'] }],
  ])('rejects %s before calling the Backend', async (_label, body) => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: 'access-token' }) });

    const response = await updateReleaseAnnouncementState(
      'seen',
      createPostRequest(body),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves Backend status and error message', async () => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: 'access-token' }) });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Release is not in scope' }), {
        status: 400,
      }),
    );

    const response = await updateReleaseAnnouncementState(
      'dismiss',
      createPostRequest({ release_ids: ['walpaca-1.0.0'] }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'Release is not in scope' });
  });
});
