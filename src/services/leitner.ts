import { addDays } from 'date-fns';

import type { Opening } from './openings';

export const LEITNER_BOX_COUNT = 5;
const BOX_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
const FIRST_BOX = 1;

export interface LineProgress {
  lineId: string;
  box: number;
  dueAt: number;
  lastReviewedAt: number;
  reviews: number;
  lapses: number;
}

interface ReviewQueueParams {
  lines: Array<Opening>;
  progressByLine: Map<string, LineProgress>;
  now: number;
  newLineLimit: number;
}

export function reviewLine(
  previous: LineProgress | undefined,
  lineId: string,
  isSuccess: boolean,
  now: number
): LineProgress {
  const box = isSuccess
    ? Math.min((previous?.box ?? 0) + 1, LEITNER_BOX_COUNT)
    : FIRST_BOX;

  return {
    lineId,
    box,
    dueAt: isSuccess ? addDays(now, BOX_INTERVAL_DAYS[box - 1]).getTime() : now,
    lastReviewedAt: now,
    reviews: (previous?.reviews ?? 0) + 1,
    lapses: (previous?.lapses ?? 0) + (isSuccess ? 0 : 1),
  };
}

export function isDue(progress: LineProgress, now: number): boolean {
  return progress.dueAt <= now;
}

export function buildReviewQueue({
  lines,
  progressByLine,
  now,
  newLineLimit,
}: ReviewQueueParams): Array<Opening> {
  const due = lines
    .flatMap((line) => {
      const progress = progressByLine.get(line.id);
      return progress && isDue(progress, now) ? [{ line, progress }] : [];
    })
    .sort((a, b) => a.progress.dueAt - b.progress.dueAt)
    .map(({ line }) => line);

  const unseen = lines
    .filter((line) => !progressByLine.has(line.id))
    .sort((a, b) => a.moves.length - b.moves.length)
    .slice(0, newLineLimit);

  return [...due, ...unseen];
}
