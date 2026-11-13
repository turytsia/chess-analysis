import { describe, expect, it, vi } from 'vitest';

import { analyzePositions, getTerminalEval, toPositionEval } from './analysis';
import type { Engine, SearchLine } from './engine';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const CHECKMATE = '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1';
const STALEMATE = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';

function engineOf(search: Engine['search']): Engine {
  return {
    isMultiThreaded: false,
    configure: vi.fn(async () => undefined),
    startNewGame: vi.fn(async () => undefined),
    search,
    stop: vi.fn(),
    terminate: vi.fn(),
  };
}

function lineOf(cp: number): Array<SearchLine> {
  return [{ multiPv: 1, depth: 12, cp, pv: ['e2e4'] }];
}

describe('analysis', () => {
  describe('analyzePositions', () => {
    it('should evaluate every position in order and report progress', async () => {
      const search = vi.fn(async () => lineOf(30));
      const onProgress = vi.fn();

      const evals = await analyzePositions({
        engine: engineOf(search),
        fens: [START, AFTER_E4],
        depth: 12,
        completed: [],
        signal: new AbortController().signal,
        onProgress,
      });

      expect(search.mock.calls).toEqual([
        [START, 12],
        [AFTER_E4, 12],
      ]);
      expect(evals).toHaveLength(2);
      expect(onProgress).toHaveBeenCalledTimes(2);
    });

    it('should resume after the positions that were already analyzed', async () => {
      const search = vi.fn(async () => lineOf(30));
      const completed = [toPositionEval(START, lineOf(10))];

      const evals = await analyzePositions({
        engine: engineOf(search),
        fens: [START, AFTER_E4],
        depth: 12,
        completed,
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      });

      expect(search.mock.calls).toEqual([[AFTER_E4, 12]]);
      expect(evals[0]).toBe(completed[0]);
    });

    it('should not ask the engine about finished games', async () => {
      const search = vi.fn(async () => lineOf(30));

      const evals = await analyzePositions({
        engine: engineOf(search),
        fens: [CHECKMATE],
        depth: 12,
        completed: [],
        signal: new AbortController().signal,
        onProgress: vi.fn(),
      });

      expect(search).not.toHaveBeenCalled();
      expect(evals).toEqual([{ lines: [], outcome: 'whiteWins' }]);
    });

    it('should stop the engine and drop the unfinished position when cancelled', async () => {
      const controller = new AbortController();
      const engine = engineOf(
        vi.fn(async () => {
          controller.abort();
          return lineOf(30);
        })
      );

      const evals = await analyzePositions({
        engine,
        fens: [START, AFTER_E4],
        depth: 12,
        completed: [],
        signal: controller.signal,
        onProgress: vi.fn(),
      });

      expect(engine.stop).toHaveBeenCalledTimes(1);
      expect(evals).toEqual([]);
    });
  });

  describe('toPositionEval', () => {
    it('should keep scores as they are when White is to move', () => {
      expect(toPositionEval(START, lineOf(30)).lines[0].cp).toBe(30);
    });

    it("should flip scores to White's point of view when Black is to move", () => {
      expect(toPositionEval(AFTER_E4, lineOf(30)).lines[0].cp).toBe(-30);
      expect(
        toPositionEval(AFTER_E4, [
          { multiPv: 1, depth: 12, mate: 2, pv: ['e7e5'] },
        ]).lines[0].mate
      ).toBe(-2);
    });
  });

  describe('getTerminalEval', () => {
    it('should award a checkmate to the side that delivered it', () => {
      expect(getTerminalEval(CHECKMATE)).toEqual({
        lines: [],
        outcome: 'whiteWins',
      });
    });

    it('should score a stalemate as a draw', () => {
      expect(getTerminalEval(STALEMATE)).toEqual({
        lines: [],
        outcome: 'draw',
      });
    });

    it('should leave ongoing positions to the engine', () => {
      expect(getTerminalEval(START)).toBeUndefined();
    });
  });
});
