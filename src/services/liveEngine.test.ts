import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Engine, SearchLine } from './engine';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const OPTIONS = { threads: 2, hashMb: 64, multiPv: 2 };
const LINES: Array<SearchLine> = [
  { multiPv: 1, depth: 12, cp: 30, pv: ['e2e4'] },
];

const createEngine = vi.fn<() => Promise<Engine>>();

vi.mock('./engine', () => ({ createEngine }));

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

async function loadEvaluateLive(): Promise<
  typeof import('./liveEngine').evaluateLive
> {
  vi.resetModules();
  return (await import('./liveEngine')).evaluateLive;
}

describe('evaluateLive', () => {
  beforeEach(() => {
    createEngine.mockReset();
  });

  it('should resolve with the evaluation of the position', async () => {
    createEngine.mockResolvedValue(engineOf(async () => LINES));
    const evaluateLive = await loadEvaluateLive();

    const evaluation = await evaluateLive({
      fen: START,
      depth: 12,
      options: OPTIONS,
      signal: new AbortController().signal,
      onSearched: vi.fn(),
    });

    expect(evaluation?.lines[0].cp).toBe(30);
  });

  it('should start one engine and reuse it', async () => {
    createEngine.mockResolvedValue(engineOf(async () => LINES));
    const evaluateLive = await loadEvaluateLive();
    const request = {
      fen: START,
      depth: 12,
      options: OPTIONS,
      signal: new AbortController().signal,
      onSearched: vi.fn(),
    };

    await evaluateLive(request);
    await evaluateLive(request);

    expect(createEngine).toHaveBeenCalledTimes(1);
  });

  it('should send the options again only when they change', async () => {
    const engine = engineOf(async () => LINES);
    createEngine.mockResolvedValue(engine);
    const evaluateLive = await loadEvaluateLive();
    const request = {
      fen: START,
      depth: 12,
      signal: new AbortController().signal,
      onSearched: vi.fn(),
    };

    await evaluateLive({ ...request, options: OPTIONS });
    await evaluateLive({ ...request, options: OPTIONS });
    await evaluateLive({ ...request, options: { ...OPTIONS, multiPv: 3 } });

    expect(engine.configure).toHaveBeenCalledTimes(2);
  });

  it('should start a new engine once when the first one cannot be started', async () => {
    createEngine
      .mockRejectedValueOnce(new Error('Engine worker failed'))
      .mockResolvedValue(engineOf(async () => LINES));
    const evaluateLive = await loadEvaluateLive();

    const evaluation = await evaluateLive({
      fen: START,
      depth: 12,
      options: OPTIONS,
      signal: new AbortController().signal,
      onSearched: vi.fn(),
    });

    expect(createEngine).toHaveBeenCalledTimes(2);
    expect(evaluation?.lines[0].cp).toBe(30);
  });

  it('should replace an engine that crashes during a search', async () => {
    createEngine
      .mockResolvedValueOnce(
        engineOf(async () => {
          throw new Error('Engine worker failed');
        })
      )
      .mockResolvedValue(engineOf(async () => LINES));
    const evaluateLive = await loadEvaluateLive();

    const evaluation = await evaluateLive({
      fen: START,
      depth: 12,
      options: OPTIONS,
      signal: new AbortController().signal,
      onSearched: vi.fn(),
    });

    expect(evaluation?.lines[0].cp).toBe(30);
  });

  it('should fail when the engine cannot be started twice in a row', async () => {
    createEngine.mockRejectedValue(new Error('Engine worker failed'));
    const evaluateLive = await loadEvaluateLive();

    await expect(
      evaluateLive({
        fen: START,
        depth: 12,
        options: OPTIONS,
        signal: new AbortController().signal,
        onSearched: vi.fn(),
      })
    ).rejects.toThrow('Engine worker failed');
    expect(createEngine).toHaveBeenCalledTimes(2);
  });
});
