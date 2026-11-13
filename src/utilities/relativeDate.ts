import { differenceInCalendarDays } from 'date-fns';

const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

interface RelativeDate {
  unit: 'day' | 'week' | 'month' | 'year';
  count: number;
  isFuture: boolean;
}

export function getRelativeDate(timestamp: number, now: number): RelativeDate {
  const days = differenceInCalendarDays(timestamp, now);
  const distance = Math.abs(days);
  const isFuture = days > 0;

  if (distance < DAYS_PER_WEEK) {
    return { unit: 'day', count: distance, isFuture };
  }
  if (distance < DAYS_PER_MONTH) {
    return {
      unit: 'week',
      count: Math.floor(distance / DAYS_PER_WEEK),
      isFuture,
    };
  }
  if (distance < DAYS_PER_YEAR) {
    return {
      unit: 'month',
      count: Math.floor(distance / DAYS_PER_MONTH),
      isFuture,
    };
  }
  return {
    unit: 'year',
    count: Math.floor(distance / DAYS_PER_YEAR),
    isFuture,
  };
}
