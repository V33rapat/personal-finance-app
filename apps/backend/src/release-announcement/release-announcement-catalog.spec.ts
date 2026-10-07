import {
  ReleaseAnnouncementCatalog,
  validateReleaseCatalog,
} from './release-announcement-catalog';

const release = (overrides: Record<string, unknown> = {}) => ({
  id: 'walpaca-1.0.0',
  version: '1.0.0',
  release_order: 1,
  published_at: '2026-10-07T00:00:00.000Z',
  title: 'อัปเดต Walpaca',
  summary: 'มีการปรับปรุงระบบ',
  updates: {
    features: [{ text: 'ดูรายการอัปเดตได้', href: '/whats-new' }],
    improvements: [],
    fixes: [],
  },
  ...overrides,
});

describe('validateReleaseCatalog', () => {
  it('accepts an empty catalog until the first release is announced', () => {
    expect(validateReleaseCatalog([])).toEqual([]);
  });

  it('normalizes content and sorts releases by explicit order', () => {
    const newer = release({
      id: 'walpaca-1.1.0',
      version: '1.1.0',
      release_order: 2,
    });

    expect(
      validateReleaseCatalog([release(), newer]).map((item) => item.id),
    ).toEqual(['walpaca-1.1.0', 'walpaca-1.0.0']);
  });

  it.each([
    [
      'duplicate ID',
      [release(), release({ release_order: 2 })],
      /Duplicate release ID/,
    ],
    [
      'duplicate order',
      [release(), release({ id: 'walpaca-1.1.0', version: '1.1.0' })],
      /Duplicate release_order/,
    ],
    [
      'empty update groups',
      [release({ updates: { features: [], improvements: [], fixes: [] } })],
      /at least one update/,
    ],
    [
      'external links',
      [
        release({
          updates: {
            features: [{ text: 'เปิดเว็บ', href: 'https://example.com' }],
            improvements: [],
            fixes: [],
          },
        }),
      ],
      /internal paths/,
    ],
    [
      'protocol relative links',
      [
        release({
          updates: {
            features: [{ text: 'เปิดเว็บ', href: '//example.com' }],
            improvements: [],
            fixes: [],
          },
        }),
      ],
      /internal paths/,
    ],
    [
      'unregistered application routes',
      [
        release({
          updates: {
            features: [{ text: 'เปิดเว็บ', href: '/not-a-real-page' }],
            improvements: [],
            fixes: [],
          },
        }),
      ],
      /internal paths/,
    ],
  ])('rejects %s', (_name, catalog, error) => {
    expect(() => validateReleaseCatalog(catalog)).toThrow(error);
  });

  it('rejects invalid UTC dates and duplicate versions', () => {
    expect(() =>
      validateReleaseCatalog([release({ published_at: '2026-10-07' })]),
    ).toThrow(/UTC published_at/);
    expect(() =>
      validateReleaseCatalog([
        release(),
        release({ id: 'walpaca-1.1.0', release_order: 2 }),
      ]),
    ).toThrow(/Duplicate version/);
  });
});

describe('ReleaseAnnouncementCatalog', () => {
  it('keeps future announcements out of the published list', () => {
    const catalog = new ReleaseAnnouncementCatalog();
    expect(catalog.getPublished(new Date('2026-10-06T00:00:00.000Z'))).toEqual(
      [],
    );
  });
});
