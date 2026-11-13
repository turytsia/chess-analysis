import { describe, expect, it } from 'vitest';

import { getRelativeDate } from './relativeDate';

const NOW = new Date(2026, 10, 13, 15, 30).getTime();

function daysFromNow(days: number, hour = 12): number {
  return new Date(2026, 10, 13 + days, hour).getTime();
}

describe('getRelativeDate', () => {
  it('should treat any time on the same calendar day as today', () => {
    expect(getRelativeDate(daysFromNow(0, 0), NOW)).toEqual({
      unit: 'day',
      count: 0,
      isFuture: false,
    });
    expect(getRelativeDate(daysFromNow(0, 23), NOW)).toEqual({
      unit: 'day',
      count: 0,
      isFuture: false,
    });
  });

  it('should count calendar days, not 24-hour periods', () => {
    expect(getRelativeDate(daysFromNow(-1, 23), NOW)).toEqual({
      unit: 'day',
      count: 1,
      isFuture: false,
    });
  });

  it.each([
    { days: -6, unit: 'day', count: 6 },
    { days: -7, unit: 'week', count: 1 },
    { days: -20, unit: 'week', count: 2 },
    { days: -29, unit: 'week', count: 4 },
    { days: -30, unit: 'month', count: 1 },
    { days: -200, unit: 'month', count: 6 },
    { days: -364, unit: 'month', count: 12 },
    { days: -365, unit: 'year', count: 1 },
    { days: -800, unit: 'year', count: 2 },
  ])(
    'should describe $days days as $count $unit(s) in the past',
    ({ days, unit, count }) => {
      expect(getRelativeDate(daysFromNow(days), NOW)).toEqual({
        unit,
        count,
        isFuture: false,
      });
    }
  );

  it('should mark later dates as being in the future', () => {
    expect(getRelativeDate(daysFromNow(1), NOW)).toEqual({
      unit: 'day',
      count: 1,
      isFuture: true,
    });
    expect(getRelativeDate(daysFromNow(14), NOW)).toEqual({
      unit: 'week',
      count: 2,
      isFuture: true,
    });
  });
});
