import { Chess } from 'chess.js';

import type { Engine, SearchLine } from './engine';
import type { EvalLine, PositionEval } from './evaluation';

export interface CompletedSearch {
  engineName: string;
  isMultiThreaded: boolean;
  durationMs: number;
}

interface AnalyzePositionsParams {
  engine: Engine;
  fens: Array<string>;
  depth: number;
  completed: Array<PositionEval>;
  signal: AbortSignal;
  onProgress: (evals: Array<PositionEval>) => void;
  onSearched: (search: CompletedSearch) => void;
}

interface AnalyzePositionParams {
  engine: Engine;
  fen: string;
  depth: number;
  signal: AbortSignal;
  onSearched: (search: CompletedSearch) => void;
}

export async function analyzePositions({
  engine,
  fens,
  depth,
  completed,
  signal,
  onProgress,
  onSearched,
}: AnalyzePositionsParams): Promise<Array<PositionEval>> {
  let evals = completed.slice(0, fens.length);
  while (evals.length < fens.length && !signal.aborted) {
    const fen = fens[evals.length];
    const evaluation =
      getTerminalEval(fen) ??
      toPositionEval(
        fen,
        await timedSearch({ engine, fen, depth, signal, onSearched })
      );

    if (!signal.aborted) {
      evals = [...evals, evaluation];
      onProgress(evals);
    }
  }
  return evals;
}

/*
 * Resolves with the evaluation once the search has reached its full depth, or
 * with nothing when it was cancelled first. Shallower results are not reported
 * on purpose: the best move often changes while the search deepens, and
 * showing every step makes the arrow and the verdict jump around.
 */
export async function analyzePosition({
  engine,
  fen,
  depth,
  signal,
  onSearched,
}: AnalyzePositionParams): Promise<PositionEval | undefined> {
  const terminal = getTerminalEval(fen);
  if (terminal) {
    return terminal;
  }
  const lines = await timedSearch({ engine, fen, depth, signal, onSearched });
  return signal.aborted || lines.length === 0
    ? undefined
    : toPositionEval(fen, lines);
}

export function getTerminalEval(fen: string): PositionEval | undefined {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) {
    return {
      lines: [],
      outcome: chess.turn() === 'w' ? 'blackWins' : 'whiteWins',
    };
  }
  if (chess.isStalemate() || chess.isInsufficientMaterial()) {
    return { lines: [], outcome: 'draw' };
  }
  return undefined;
}

export function toPositionEval(
  fen: string,
  searchLines: Array<SearchLine>
): PositionEval {
  const sign = fen.split(' ')[1] === 'b' ? -1 : 1;
  return {
    lines: searchLines.map(
      ({ cp, mate, depth, pv }): EvalLine => ({
        ...(cp !== undefined && { cp: cp * sign }),
        ...(mate !== undefined && { mate: mate * sign }),
        depth,
        pv,
      })
    ),
  };
}

async function timedSearch({
  engine,
  fen,
  depth,
  signal,
  onSearched,
}: AnalyzePositionParams): Promise<Array<SearchLine>> {
  const startedAt = performance.now();
  const lines = await engine.search(fen, { depth, signal });
  if (!signal.aborted) {
    onSearched({
      engineName: engine.name,
      isMultiThreaded: engine.isMultiThreaded,
      durationMs: performance.now() - startedAt,
    });
  }
  return lines;
}
