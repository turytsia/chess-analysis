import { assessMoves, type MoveAssessment } from '../../services/classify';
import type { PositionEval } from '../../services/evaluation';
import { useLiveEvals } from '../../utilities/useLiveEvals';
import type { GameLine, NavigationState } from './exploration';

const NO_FENS: Array<string> = [];

interface ExplorationAnalysisParams {
  game: GameLine;
  gameEvals: Array<PositionEval>;
  navigation: NavigationState;
}

interface ExplorationAnalysis {
  evaluation: PositionEval | undefined;
  assessments: Array<MoveAssessment | undefined>;
  hasFailed: boolean;
}

/*
 * Explored moves are judged the same way as game moves. The position the
 * variation starts from uses the stored game analysis when there is one and is
 * evaluated live otherwise; every explored position is evaluated live. The
 * game move before the variation is passed along as context, because some
 * labels depend on what the opponent just did, and its own verdict is dropped.
 */
export function useExplorationAnalysis({
  game,
  gameEvals,
  navigation: { ply, variation, cursor },
}: ExplorationAnalysisParams): ExplorationAnalysis {
  const storedBase = gameEvals[ply];
  const liveOffset = storedBase ? 0 : 1;
  const liveFens =
    variation.length > 0
      ? [
          ...(storedBase ? [] : [game.positions[ply]]),
          ...variation.map(({ fenAfter }) => fenAfter),
        ]
      : NO_FENS;
  const { evals, hasFailed } = useLiveEvals(
    liveFens,
    cursor > 0 ? cursor - 1 + liveOffset : 0
  );

  const lineEvals = [
    storedBase ?? evals[0],
    ...variation.map((_, index) => evals[index + liveOffset]),
  ];
  const previousMove = game.moves[ply - 1];
  const assessments = previousMove
    ? assessMoves({
        moves: [previousMove, ...variation],
        evals: [gameEvals[ply - 1], ...lineEvals],
        bookPlies: 0,
      }).slice(1)
    : assessMoves({ moves: variation, evals: lineEvals, bookPlies: 0 });

  return {
    evaluation:
      cursor > 0 ? evals[cursor - 1 + liveOffset] : storedBase ?? evals[0],
    assessments,
    hasFailed,
  };
}
