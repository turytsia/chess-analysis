import type { BoardArrow } from '../components/Board';
import type { PositionEval } from '../services/evaluation';

const BEST_MOVE_ARROW_COLOR = 'var(--label-positive)';

export function toBestMoveArrows(
  evaluation: PositionEval | undefined
): Array<BoardArrow> {
  const bestMove = evaluation?.lines[0]?.pv[0];
  return bestMove
    ? [
        {
          from: bestMove.slice(0, 2),
          to: bestMove.slice(2, 4),
          color: BEST_MOVE_ARROW_COLOR,
        },
      ]
    : [];
}
