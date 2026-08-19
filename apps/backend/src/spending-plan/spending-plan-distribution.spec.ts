import {
  buildDailyAllocations,
  getDistributionDates,
  type DistributionRule,
} from './spending-plan-distribution';

describe('spending plan distribution rules', () => {
  const window = {
    planStart: '2026-08-03',
    start: '2026-08-03',
    end: '2026-08-09',
  };

  it('selects every day for equal daily distribution', () => {
    const rule: DistributionRule = {
      type: 'equal_daily',
      weekdays: [],
      dates: [],
    };

    expect(
      getDistributionDates(window.planStart, window.start, window.end, rule),
    ).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ]);
  });

  it('selects Monday through Friday for weekdays', () => {
    const rule: DistributionRule = {
      type: 'weekdays',
      weekdays: [],
      dates: [],
    };

    expect(
      getDistributionDates(window.planStart, window.start, window.end, rule),
    ).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
    ]);
  });

  it('selects configured weekdays every week', () => {
    const rule: DistributionRule = {
      type: 'weekly',
      weekdays: [1, 5],
      dates: [],
    };

    expect(
      getDistributionDates('2026-08-03', '2026-08-03', '2026-08-16', rule),
    ).toEqual(['2026-08-03', '2026-08-07', '2026-08-10', '2026-08-14']);
  });

  it('anchors biweekly selection to the original plan start', () => {
    const rule: DistributionRule = {
      type: 'biweekly',
      weekdays: [1],
      dates: [],
    };

    expect(
      getDistributionDates('2026-08-03', '2026-08-03', '2026-08-24', rule),
    ).toEqual(['2026-08-03', '2026-08-17']);
    expect(
      getDistributionDates('2026-08-03', '2026-08-10', '2026-08-24', rule),
    ).toEqual(['2026-08-17']);
  });

  it('keeps only specific dates inside the editable window', () => {
    const rule: DistributionRule = {
      type: 'specific_dates',
      weekdays: [],
      dates: ['2026-08-09', '2026-08-04', '2026-08-01'],
    };

    expect(
      getDistributionDates(window.planStart, window.start, window.end, rule),
    ).toEqual(['2026-08-04', '2026-08-09']);
  });

  it('puts leftover cents on the first selected days', () => {
    expect(
      buildDailyAllocations('2026-08-03', '2026-08-05', 10, [
        '2026-08-03',
        '2026-08-05',
      ]),
    ).toEqual([
      { date: '2026-08-03', amount: 5 },
      { date: '2026-08-04', amount: 0 },
      { date: '2026-08-05', amount: 5 },
    ]);

    expect(
      buildDailyAllocations('2026-08-03', '2026-08-05', 10.01, [
        '2026-08-03',
        '2026-08-04',
        '2026-08-05',
      ]),
    ).toEqual([
      { date: '2026-08-03', amount: 3.34 },
      { date: '2026-08-04', amount: 3.34 },
      { date: '2026-08-05', amount: 3.33 },
    ]);
  });
});
