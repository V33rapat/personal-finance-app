import { assertReleaseCatalogCompatible } from './release-announcement-compatibility';
import type { ReleaseAnnouncement } from './release-announcement.types';

const publishedRelease: ReleaseAnnouncement = {
  id: 'walpaca-1.0.0',
  version: '1.0.0',
  release_order: 1,
  published_at: '2026-10-01T00:00:00.000Z',
  title: 'Walpaca 1.0.0',
  summary: 'ประกาศอัปเดต',
  updates: {
    features: [{ text: 'เพิ่มฟีเจอร์' }],
    improvements: [],
    fixes: [],
  },
};

const now = new Date('2026-10-07T00:00:00.000Z');

describe('assertReleaseCatalogCompatible', () => {
  it('allows correcting copy while preserving published release identity', () => {
    const corrected = { ...publishedRelease, summary: 'แก้ไขข้อความ' };

    expect(() =>
      assertReleaseCatalogCompatible([publishedRelease], [corrected], now),
    ).not.toThrow();
  });

  it('rejects removing a published release', () => {
    expect(() =>
      assertReleaseCatalogCompatible([publishedRelease], [], now),
    ).toThrow('Published release walpaca-1.0.0 cannot be removed');
  });

  it.each([
    ['version', { version: '1.0.1' }],
    ['release order', { release_order: 2 }],
    ['publication date', { published_at: '2026-10-02T00:00:00.000Z' }],
  ])('rejects changing the published %s', (_field, change) => {
    expect(() =>
      assertReleaseCatalogCompatible(
        [publishedRelease],
        [{ ...publishedRelease, ...change }],
        now,
      ),
    ).toThrow(/immutable identity metadata/);
  });

  it('requires newly added releases to follow the highest published order', () => {
    const insertedRelease = {
      ...publishedRelease,
      id: 'walpaca-0.9.0',
      version: '0.9.0',
      release_order: 1,
    };

    expect(() =>
      assertReleaseCatalogCompatible(
        [publishedRelease],
        [publishedRelease, insertedRelease],
        now,
      ),
    ).toThrow(/greater than 1/);
  });

  it('does not freeze entries that have not been published yet', () => {
    const scheduled = {
      ...publishedRelease,
      id: 'walpaca-1.1.0',
      version: '1.1.0',
      release_order: 2,
      published_at: '2099-01-01T00:00:00.000Z',
    };

    expect(() =>
      assertReleaseCatalogCompatible(
        [publishedRelease, scheduled],
        [{ ...publishedRelease, summary: 'แก้ข้อความ' }],
        now,
      ),
    ).not.toThrow();
  });
});
