import { useMemo } from 'react';

import { assessMoves, MoveLabel } from '../../services/classify';
import type { PositionEval } from '../../services/evaluation';
import { playLine, type GameMove } from '../../services/pgn';
import { useLiveEvals } from '../../utilities/useLiveEvals';
import type { BrowseLine } from './browseLine';

interface LineAnalysisParams {
  line: BrowseLine;
  positions: Array<string>;
  bookLength: number;
}

interface LineAnalysis {
  shownMove: GameMove | undefined;
  label: MoveLabel | undefined;
  evaluation: PositionEval | undefined;
  hasFailed: boolean;
}

/*
 * Judges the move shown on the board. A move that follows the opening book is
 * labeled Book without asking the engine. Any other move is judged by the
 * engine, which needs the position before the move as well as the one on the
 * board; the move before it is passed along as context, because some labels
 * depend on what the opponent just did.
 */
export function useLineAnalysis({
  line,
  positions,
  bookLength,
}: LineAnalysisParams): LineAnalysis {
  const moves = useMemo(() => playLine(line.moves), [line.moves]);
  const { cursor } = line;
  const shownMove = moves[cursor - 1];
  const isBookMove = cursor <= bookLength;
  const needsVerdict = shownMove !== undefined && !isBookMove;
  const liveFens = needsVerdict
    ? [positions[cursor], positions[cursor - 1]]
    : [positions[cursor]];
  const { evals, hasFailed } = useLiveEvals(liveFens, 0);
  const [evaluation, evaluationBefore] = evals;

  const previousMove = moves[cursor - 2];
  const [assessment] = needsVerdict
    ? assessMoves({
        moves: previousMove ? [previousMove, shownMove] : [shownMove],
        evals: previousMove
          ? [undefined, evaluationBefore, evaluation]
          : [evaluationBefore, evaluation],
        bookPlies: 0,
      }).slice(-1)
    : [];

  return {
    shownMove,
    label: shownMove && isBookMove ? MoveLabel.Book : assessment?.label,
    evaluation,
    hasFailed,
  };
}
