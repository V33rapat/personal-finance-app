import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
} from '../_lib/bff';

const RELEASE_ID_PATTERN = /^[a-z0-9][a-z0-9.-]{1,99}$/;
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' };

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function isReleaseIdsBody(body: unknown): body is { release_ids: string[] } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return false;
  }

  const releaseIds = (body as { release_ids?: unknown }).release_ids;
  return (
    Array.isArray(releaseIds) &&
    releaseIds.length > 0 &&
    releaseIds.length <= 100 &&
    releaseIds.every(
      (releaseId) =>
        typeof releaseId === 'string' && RELEASE_ID_PATTERN.test(releaseId),
    ) &&
    new Set(releaseIds).size === releaseIds.length
  );
}

export async function getReleaseAnnouncements(path: 'popup' | 'history') {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return jsonResponse({ message: 'Unauthorized' }, 401);
    }

    const response = await fetch(
      `${getBackendUrl()}/release-announcement/${path}`,
      { headers: authHeader, cache: 'no-store' },
    );
    const data = await readJson(response);
    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? data.message
          : `Failed to load release announcement ${path}`;
      return jsonResponse({ message }, response.status);
    }

    return jsonResponse(data, response.status);
  } catch {
    return jsonResponse({ message: 'Server is not ready' }, 500);
  }
}

export async function updateReleaseAnnouncementState(
  path: 'seen' | 'dismiss',
  request: NextRequest,
) {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) {
      return jsonResponse({ message: 'Unauthorized' }, 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ message: 'Invalid request body' }, 400);
    }

    if (!isReleaseIdsBody(body)) {
      return jsonResponse({ message: 'Invalid release IDs' }, 400);
    }

    const response = await fetch(
      `${getBackendUrl()}/release-announcement/${path}`,
      {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ release_ids: body.release_ids }),
        cache: 'no-store',
      },
    );
    const data = await readJson(response);
    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? data.message
          : `Failed to update release announcement ${path}`;
      return jsonResponse({ message }, response.status);
    }

    return jsonResponse(data, response.status);
  } catch {
    return jsonResponse({ message: 'Server is not ready' }, 500);
  }
}
