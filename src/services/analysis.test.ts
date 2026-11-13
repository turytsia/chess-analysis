import { describe, expect, it, vi } from 'vitest';

import {
  analyzePosition,
  analyzePositions,
  getTerminalEval,
  toPositionEval,
} from './analysis';
import type { Engine, SearchLine } from './engine';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const CHECKMATE = '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1';
const STALEMATE = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';

function engineOf(search: Engine['search']): Engine {
  return {
    name: 'Test engine',
    isMultiThreaded: false,
    configure: vi.fn(async () => undefined),
    startNewGame: vi.fn(async () => undefined),
    search,
    terminate: vi.fn(),
  };
}

function lineOf(cp: number, depth = 12): Array<SearchLine> {
  return [{ multiPv: 1, depth, cp, pv: ['e2e4'] }];
}

describe('analysis', () => {
  describe('analyzePositions', () => {
    it('should evaluate every position in order and report progress', async () => {
      const search = vi.fn<Engine['search']>(async () => lineOf(30));
      const onProgress = vi.fn();
      const onSearched = vi.fn();
      const { signal } = new AbortController();

      const evals = await analyzePositions({
        engine: engineOf(search),
        fens: [START, AFTER_E4],
        depth: 12,
        completed: [],
        signal,
        onProgress,
        onSearched,
      });

      expect(search.mock.calls).toEqual([
        [START, { depth: 12, signal }],
        [AFTER_E4, { depth: 12, signal }],
      ]);
      expect(evals).toHaveLength(2);
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onSearched).toHaveBeenCalledTimes(2);
    });

    it('should resume after the positions that were already analyzed', async () => {
      const search = vi.fn<Engine['search']>(async () => lineOf(30));
      const completed = [toPositionEval(START, lineOf(10))];

      const evals = await analyzePositions({
        engine: engineOf(search),
        fens: [START, AFTER_E4],
        depth: 12,
        completed,
        signal: new AbortController().signal,
        onProgress: vi.fn(),
        onSearched: vi.fn(),
      });

      expect(search.mock.calls.map(([fen]) => fen)).toEqual([AFTER_E4]);
      expect(evals[0]).toBe(completed[0]);
    });

    it('should not ask the engine about finished games', async () => {
      const search = vi.fn<Engine['search']>(async () => lineOf(30));

      const evals = await analyzePositions({
        engine: engineOf(search),
        fens: [CHECKMATE],
        depth: 12,
        completed: [],
        signal: new AbortController().signal,
        onProgress: vi.fn(),
        onSearched: vi.fn(),
      });

      expect(search).not.toHaveBeenCalled();
      expect(evals).toEqual([{ lines: [], outcome: 'whiteWins' }]);
    });

    it('should drop the unfinished position and stop when cancelled', async () => {
      const controller = new AbortController();
      const search = vi.fn<Engine['search']>(async () => {
        controller.abort();
        return lineOf(30);
      });

      const evals = await analyzePositions({
        engine: engineOf(search),
        fens: [START, AFTER_E4],
        depth: 12,
        completed: [],
        signal: controller.signal,
        onProgress: vi.fn(),
        onSearched: vi.fn(),
      });

      expect(search).toHaveBeenCalledTimes(1);
      expect(evals).toEqual([]);
    });
  });

  describe('analyzePosition', () => {
    it('should resolve with the evaluation once the search has finished', async () => {
      const search = vi.fn<Engine['search']>(async () => lineOf(30));
      const onSearched = vi.fn();
      const { signal } = new AbortController();

      const evaluation = await analyzePosition({
        engine: engineOf(search),
        fen: START,
        depth: 12,
        signal,
        onSearched,
      });

      expect(search).toHaveBeenCalledWith(START, { depth: 12, signal });
      expect(evaluation).toEqual({
        lines: [{ cp: 30, depth: 12, pv: ['e2e4'] }],
      });
      expect(onSearched).toHaveBeenCalledWith({
        engineName: 'Test engine',
        isMultiThreaded: false,
        durationMs: expect.any(Number),
      });
    });

    it("should give scores from White's point of view", async () => {
      const evaluation = await analyzePosition({
        engine: engineOf(async () => lineOf(30)),
        fen: AFTER_E4,
        depth: 12,
        signal: new AbortController().signal,
        onSearched: vi.fn(),
      });

      expect(evaluation?.lines[0].cp).toBe(-30);
    });

    it('should resolve with the result of a finished game without asking the engine', async () => {
      const search = vi.fn<Engine['search']>(async () => lineOf(30));
      const onSearched = vi.fn();

      const evaluation = await analyzePosition({
        engine: engineOf(search),
        fen: STALEMATE,
        depth: 12,
        signal: new AbortController().signal,
        onSearched,
      });

      expect(search).not.toHaveBeenCalled();
      expect(onSearched).not.toHaveBeenCalled();
      expect(evaluation).toEqual({ lines: [], outcome: 'draw' });
    });

    it('should resolve with nothing when the search was cancelled', async () => {
      const controller = new AbortController();
      const search: Engine['search'] = async () => {
        controller.abort();
        return lineOf(30);
      };
      const onSearched = vi.fn();

      const evaluation = await analyzePosition({
        engine: engineOf(search),
        fen: START,
        depth: 12,
        signal: controller.signal,
        onSearched,
      });

      expect(evaluation).toBeUndefined();
      expect(onSearched).not.toHaveBeenCalled();
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
