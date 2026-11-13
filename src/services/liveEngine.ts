import { analyzePosition, type CompletedSearch } from './analysis';
import { createEngine, type Engine, type EngineOptions } from './engine';
import type { PositionEval } from './evaluation';

const MAX_ATTEMPTS = 2;

let enginePromise: Promise<Engine> | undefined;
let appliedOptions: string | undefined;

interface LiveEvaluationParams {
  fen: string;
  depth: number;
  options: EngineOptions;
  signal: AbortSignal;
  onSearched: (search: CompletedSearch) => void;
}

/*
 * Live evaluation uses its own engine, separate from the one that analyzes
 * whole games, so exploring a position never waits for a running game
 * analysis. Options are re-sent only when they change, because setting them
 * again makes Stockfish rebuild its threads and clear its hash table. An
 * engine that fails to start or crashes is thrown away and started again once
 * before the failure is reported.
 */
export async function evaluateLive(
  params: LiveEvaluationParams
): Promise<PositionEval | undefined> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await evaluateOnce(params);
    } catch (error) {
      enginePromise = undefined;
      appliedOptions = undefined;
      if (attempt >= MAX_ATTEMPTS || params.signal.aborted) {
        throw error;
      }
    }
  }
}

async function evaluateOnce({
  fen,
  depth,
  options,
  signal,
  onSearched,
}: LiveEvaluationParams): Promise<PositionEval | undefined> {
  enginePromise ??= createEngine();
  const engine = await enginePromise;
  const optionsKey = JSON.stringify(options);
  if (appliedOptions !== optionsKey) {
    appliedOptions = optionsKey;
    await engine.configure(options);
  }
  return analyzePosition({ engine, fen, depth, signal, onSearched });
}
