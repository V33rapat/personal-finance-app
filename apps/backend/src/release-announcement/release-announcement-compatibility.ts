import type { ReleaseAnnouncement } from './release-announcement.types';

export function assertReleaseCatalogCompatible(
  previous: ReleaseAnnouncement[],
  current: ReleaseAnnouncement[],
  now = new Date(),
): void {
  const previousIds = new Set(previous.map((release) => release.id));
  const currentById = new Map(current.map((release) => [release.id, release]));
  const previouslyPublished = previous.filter(
    (release) => Date.parse(release.published_at) <= now.getTime(),
  );

  for (const previousRelease of previouslyPublished) {
    const currentRelease = currentById.get(previousRelease.id);
    if (!currentRelease) {
      throw new Error(
        `Published release ${previousRelease.id} cannot be removed`,
      );
    }

    if (
      currentRelease.version !== previousRelease.version ||
      currentRelease.release_order !== previousRelease.release_order ||
      currentRelease.published_at !== previousRelease.published_at
    ) {
      throw new Error(
        `Published release ${previousRelease.id} has immutable identity metadata`,
      );
    }
  }

  const highestPublishedOrder = previouslyPublished.reduce(
    (highest, release) => Math.max(highest, release.release_order),
    0,
  );

  for (const release of current) {
    if (
      !previousIds.has(release.id) &&
      release.release_order <= highestPublishedOrder
    ) {
      throw new Error(
        `New release ${release.id} must have an order greater than ${highestPublishedOrder}`,
      );
    }
  }
}
