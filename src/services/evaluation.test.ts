import { describe, expect, it } from 'vitest';

import {
  gameAccuracy,
  lineWinPercent,
  moveAccuracy,
  moverAt,
  toMoverWinPercent,
  whiteWinPercent,
} from './evaluation';

describe('evaluation', () => {
  describe('lineWinPercent', () => {
    it('should give even chances for a level evaluation', () => {
      expect(lineWinPercent({ cp: 0, depth: 16, pv: [] })).toBe(50);
    });

    it('should favor White for a positive evaluation and Black for a negative one', () => {
      expect(lineWinPercent({ cp: 300, depth: 16, pv: [] })).toBeCloseTo(
        75.1,
        1
      );
      expect(lineWinPercent({ cp: -300, depth: 16, pv: [] })).toBeCloseTo(
        24.9,
        1
      );
    });

    it('should treat a forced mate as a decided game', () => {
      expect(lineWinPercent({ mate: 3, depth: 16, pv: [] })).toBe(100);
      expect(lineWinPercent({ mate: -3, depth: 16, pv: [] })).toBe(0);
    });
  });

  describe('whiteWinPercent', () => {
    it('should use the first engine line', () => {
      expect(
        whiteWinPercent({
          lines: [
            { mate: 2, depth: 16, pv: [] },
            { cp: -900, depth: 16, pv: [] },
          ],
        })
      ).toBe(100);
    });

    it('should use the result of a finished game', () => {
      expect(whiteWinPercent({ lines: [], outcome: 'blackWins' })).toBe(0);
      expect(whiteWinPercent({ lines: [], outcome: 'draw' })).toBe(50);
    });
  });

  describe('toMoverWinPercent', () => {
    it('should mirror the value for Black', () => {
      expect(toMoverWinPercent(70, 'white')).toBe(70);
      expect(toMoverWinPercent(70, 'black')).toBe(30);
    });
  });

  describe('moveAccuracy', () => {
    it('should be perfect when the move does not lose winning chances', () => {
      expect(moveAccuracy(50, 62)).toBe(100);
    });

    it('should drop as more winning chances are lost', () => {
      expect(moveAccuracy(60, 55)).toBeCloseTo(80.8, 1);
      expect(moveAccuracy(90, 10)).toBeCloseTo(1, 0);
    });
  });

  describe('moverAt', () => {
    it('should alternate from the side that moves first', () => {
      expect(moverAt(0, 'white')).toBe('white');
      expect(moverAt(1, 'white')).toBe('black');
      expect(moverAt(0, 'black')).toBe('black');
    });
  });

  describe('gameAccuracy', () => {
    it('should be undefined for games shorter than two moves', () => {
      expect(gameAccuracy([50, 50], 'white')).toBeUndefined();
    });

    it('should be perfect for both sides when the evaluation never moves', () => {
      expect(gameAccuracy([50, 50, 50, 50, 50], 'white')).toEqual({
        white: 100,
        black: 100,
      });
    });

    it('should only punish the side that lost winning chances', () => {
      const accuracy = gameAccuracy([50, 50, 50, 20, 20, 20, 20], 'white');

      expect(accuracy?.black).toBe(100);
      expect(accuracy?.white).toBeLessThan(80);
    });
  });
});
