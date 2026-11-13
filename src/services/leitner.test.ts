import { describe, expect, it } from 'vitest';

import {
  buildReviewQueue,
  isDue,
  LEITNER_BOX_COUNT,
  reviewLine,
  type LineProgress,
} from './leitner';
import type { Opening } from './openings';

const NOW = Date.UTC(2026, 10, 13, 12);
const DAY_MS = 24 * 60 * 60 * 1000;

function lineOf(id: string, plies: number): Opening {
  return {
    id,
    eco: 'B10',
    name: id,
    moves: Array.from({ length: plies }, () => 'e4'),
    epd: id,
  };
}

function progressOf(overrides: Partial<LineProgress>): LineProgress {
  return {
    lineId: 'line',
    box: 1,
    dueAt: NOW,
    lastReviewedAt: NOW - DAY_MS,
    reviews: 1,
    lapses: 0,
    ...overrides,
  };
}

describe('leitner', () => {
  describe('reviewLine', () => {
    it('should put a new line into the first box and schedule it for tomorrow', () => {
      expect(reviewLine(undefined, 'line', true, NOW)).toEqual({
        lineId: 'line',
        box: 1,
        dueAt: NOW + DAY_MS,
        lastReviewedAt: NOW,
        reviews: 1,
        lapses: 0,
      });
    });

    it('should promote a line and lengthen the interval after a clean review', () => {
      const next = reviewLine(progressOf({ box: 2 }), 'line', true, NOW);

      expect(next.box).toBe(3);
      expect(next.dueAt).toBe(NOW + 7 * DAY_MS);
    });

    it('should keep a mastered line in the last box', () => {
      const next = reviewLine(
        progressOf({ box: LEITNER_BOX_COUNT }),
        'line',
        true,
        NOW
      );

      expect(next.box).toBe(LEITNER_BOX_COUNT);
      expect(next.dueAt).toBe(NOW + 30 * DAY_MS);
    });

    it('should send a failed line back to the first box and keep it due', () => {
      const next = reviewLine(
        progressOf({ box: 4, lapses: 1 }),
        'line',
        false,
        NOW
      );

      expect(next).toMatchObject({ box: 1, dueAt: NOW, reviews: 2, lapses: 2 });
    });
  });

  describe('isDue', () => {
    it('should be true once the due time has passed', () => {
      expect(isDue(progressOf({ dueAt: NOW - 1 }), NOW)).toBe(true);
      expect(isDue(progressOf({ dueAt: NOW + 1 }), NOW)).toBe(false);
    });
  });

  describe('buildReviewQueue', () => {
    it('should list overdue lines first, oldest first, then the shortest new lines', () => {
      const lines = [
        lineOf('long-new', 9),
        lineOf('due-recently', 4),
        lineOf('short-new', 2),
        lineOf('due-long-ago', 4),
        lineOf('not-due', 4),
        lineOf('medium-new', 5),
      ];
      const progressByLine = new Map([
        [
          'due-recently',
          progressOf({ lineId: 'due-recently', dueAt: NOW - DAY_MS }),
        ],
        [
          'due-long-ago',
          progressOf({ lineId: 'due-long-ago', dueAt: NOW - 5 * DAY_MS }),
        ],
        ['not-due', progressOf({ lineId: 'not-due', dueAt: NOW + DAY_MS })],
      ]);

      const queue = buildReviewQueue({
        lines,
        progressByLine,
        now: NOW,
        newLineLimit: 2,
      });

      expect(queue.map(({ id }) => id)).toEqual([
        'due-long-ago',
        'due-recently',
        'short-new',
        'medium-new',
      ]);
    });
  });
});
