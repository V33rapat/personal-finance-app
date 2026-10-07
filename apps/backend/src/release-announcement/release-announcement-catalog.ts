import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ReleaseAnnouncement,
  ReleaseUpdateItem,
  ReleaseUpdateKind,
} from './release-announcement.types';

const UPDATE_KINDS: ReleaseUpdateKind[] = ['features', 'improvements', 'fixes'];
const RELEASE_ID_PATTERN = /^[a-z0-9][a-z0-9.-]{1,99}$/;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const INTERNAL_PATH_PATTERN =
  /^\/(?!\/)[\p{L}\p{N}/_-]*(?:\?[\p{L}\p{N}._~%=&-]*)?(?:#[\p{L}\p{N}._~-]*)?$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInternalHref(value: string): boolean {
  if (
    !INTERNAL_PATH_PATTERN.test(value) ||
    value.includes('\\') ||
    /%(?:2f|5c)/i.test(value)
  ) {
    return false;
  }

  try {
    const parsed = new URL(value, 'https://walpaca.invalid');
    return parsed.origin === 'https://walpaca.invalid';
  } catch {
    return false;
  }
}

function validateUpdateItem(
  value: unknown,
  releaseId: string,
  kind: ReleaseUpdateKind,
  index: number,
): ReleaseUpdateItem {
  if (!isRecord(value) || typeof value.text !== 'string') {
    throw new Error(`Invalid ${kind}[${index}] in release ${releaseId}`);
  }

  const text = value.text.trim();
  if (text.length === 0 || text.length > 240) {
    throw new Error(`Invalid update text in release ${releaseId}`);
  }

  if (value.href !== undefined && typeof value.href !== 'string') {
    throw new Error(`Invalid update link in release ${releaseId}`);
  }

  const href = value.href;
  if (href !== undefined && !isInternalHref(href)) {
    throw new Error(
      `Release update links must be internal paths: ${releaseId}`,
    );
  }

  return href === undefined ? { text } : { text, href };
}

export function validateReleaseCatalog(value: unknown): ReleaseAnnouncement[] {
  if (!Array.isArray(value)) {
    throw new Error('Release catalog must be an array');
  }

  const ids = new Set<string>();
  const versions = new Set<string>();
  const orders = new Set<number>();

  const releases = value.map((rawRelease): ReleaseAnnouncement => {
    if (!isRecord(rawRelease)) {
      throw new Error('Release catalog entries must be objects');
    }

    const {
      id,
      version,
      release_order: releaseOrder,
      published_at: publishedAt,
      title,
      summary,
      updates,
    } = rawRelease;

    if (typeof id !== 'string' || !RELEASE_ID_PATTERN.test(id)) {
      throw new Error('Release IDs must be stable lowercase slugs');
    }
    if (ids.has(id)) throw new Error(`Duplicate release ID: ${id}`);
    ids.add(id);

    if (typeof version !== 'string' || version.trim().length === 0) {
      throw new Error(`Release ${id} needs a version`);
    }
    if (versions.has(version)) throw new Error(`Duplicate version: ${version}`);
    versions.add(version);

    if (
      typeof releaseOrder !== 'number' ||
      !Number.isInteger(releaseOrder) ||
      releaseOrder < 1
    ) {
      throw new Error(`Release ${id} needs a positive integer release_order`);
    }
    if (orders.has(releaseOrder)) {
      throw new Error(`Duplicate release_order: ${releaseOrder}`);
    }
    orders.add(releaseOrder);

    if (
      typeof publishedAt !== 'string' ||
      !ISO_UTC_PATTERN.test(publishedAt) ||
      Number.isNaN(Date.parse(publishedAt))
    ) {
      throw new Error(`Release ${id} needs a UTC published_at timestamp`);
    }

    if (
      typeof title !== 'string' ||
      title.trim().length === 0 ||
      title.length > 100
    ) {
      throw new Error(`Release ${id} needs a title of at most 100 characters`);
    }
    if (
      typeof summary !== 'string' ||
      summary.trim().length === 0 ||
      summary.length > 300
    ) {
      throw new Error(
        `Release ${id} needs a summary of at most 300 characters`,
      );
    }
    if (!isRecord(updates)) {
      throw new Error(`Release ${id} needs update groups`);
    }

    const normalizedUpdates = {} as Record<
      ReleaseUpdateKind,
      ReleaseUpdateItem[]
    >;
    let updateCount = 0;

    for (const kind of UPDATE_KINDS) {
      const entries = updates[kind];
      if (!Array.isArray(entries) || entries.length > 30) {
        throw new Error(`Release ${id} has invalid ${kind} items`);
      }

      normalizedUpdates[kind] = entries.map((item, index) =>
        validateUpdateItem(item, id, kind, index),
      );
      updateCount += entries.length;
    }

    if (updateCount === 0) {
      throw new Error(`Release ${id} must contain at least one update`);
    }

    return {
      id,
      version,
      release_order: releaseOrder,
      published_at: publishedAt,
      title: title.trim(),
      summary: summary.trim(),
      updates: normalizedUpdates,
    };
  });

  return releases.sort(
    (left, right) => right.release_order - left.release_order,
  );
}

@Injectable()
export class ReleaseAnnouncementCatalog {
  private readonly releases: ReleaseAnnouncement[];

  constructor() {
    const catalogPath = join(__dirname, 'data', 'releases.json');
    this.releases = validateReleaseCatalog(
      JSON.parse(readFileSync(catalogPath, 'utf8')) as unknown,
    );
  }

  getPublished(now = new Date()): ReleaseAnnouncement[] {
    const nowTimestamp = now.getTime();
    return this.releases.filter(
      (release) => Date.parse(release.published_at) <= nowTimestamp,
    );
  }
}
