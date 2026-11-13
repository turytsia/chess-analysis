import { Chess } from 'chess.js';

import type { Engine, SearchLine } from './engine';
import type { EvalLine, PositionEval } from './evaluation';

export interface AnalyzePositionsParams {
  engine: Engine;
  fens: Array<string>;
  depth: number;
  completed: Array<PositionEval>;
  signal: AbortSignal;
  onProgress: (evals: Array<PositionEval>) => void;
}

export async function analyzePositions({
  engine,
  fens,
  depth,
  completed,
  signal,
  onProgress,
}: AnalyzePositionsParams): Promise<Array<PositionEval>> {
  const stopSearch = (): void => engine.stop();
  signal.addEventListener('abort', stopSearch, { once: true });

  try {
    let evals = completed.slice(0, fens.length);
    while (evals.length < fens.length && !signal.aborted) {
      const fen = fens[evals.length];
      const evaluation =
        getTerminalEval(fen) ??
        toPositionEval(fen, await engine.search(fen, depth));

      if (!signal.aborted) {
        evals = [...evals, evaluation];
        onProgress(evals);
      }
    }
    return evals;
  } finally {
    signal.removeEventListener('abort', stopSearch);
  }
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
