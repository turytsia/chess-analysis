import {
  gameAccuracy,
  lineWinPercent,
  mean,
  moveAccuracy,
  toMoverWinPercent,
  whiteWinPercent,
  type PlayerColor,
  type PositionEval,
  type SideValues,
} from './evaluation';
import {
  GamePhase,
  getMovePhases,
  capturesLastMovedPiece,
  getSacrificedMaterial,
} from './material';
import type { GameMove } from './pgn';

const THRESHOLDS = {
  excellentMaxLoss: 2,
  goodMaxLoss: 5,
  inaccuracyMaxLoss: 10,
  mistakeMaxLoss: 20,
  greatMinGap: 12,
  greatMinWinAfter: 40,
  greatMaxAlternativeWin: 80,
  brilliantMaxLoss: 2,
  brilliantMinSacrifice: 1,
  brilliantMinWinAfter: 45,
  brilliantMaxAlternativeWin: 90,
  missMinOpponentLoss: 10,
  missMinLoss: 10,
  missMinWinAfter: 45,
} as const;

export enum MoveLabel {
  Brilliant = 'brilliant',
  Great = 'great',
  Best = 'best',
  Excellent = 'excellent',
  Good = 'good',
  Book = 'book',
  Inaccuracy = 'inaccuracy',
  Mistake = 'mistake',
  Miss = 'miss',
  Blunder = 'blunder',
}

export interface MoveAssessment {
  label: MoveLabel;
  phase: GamePhase;
  winBefore: number;
  winAfter: number;
  winLoss: number;
  accuracy: number;
  isBest: boolean;
}

interface PhaseAccuracy {
  phase: GamePhase;
  accuracy: SideValues<number | undefined>;
}

interface LabelCount {
  label: MoveLabel;
  count: SideValues<number>;
}

export interface GameReport {
  assessments: Array<MoveAssessment | undefined>;
  accuracy: SideValues<number> | undefined;
  phases: Array<PhaseAccuracy>;
  counts: Array<LabelCount>;
}

interface GameReportParams {
  moves: Array<GameMove>;
  evals: Array<PositionEval>;
  bookPlies: number;
}

interface AssessMovesParams {
  moves: Array<GameMove>;
  evals: Array<PositionEval | undefined>;
  bookPlies: number;
}

interface MoveContext {
  move: GameMove;
  previousMove: GameMove | undefined;
  previousLoss: number | undefined;
  before: PositionEval;
  winBefore: number;
  winAfter: number;
  winLoss: number;
  isBest: boolean;
}

export function buildGameReport({
  moves,
  evals,
  bookPlies,
}: GameReportParams): GameReport {
  const assessments = assessMoves({ moves, evals, bookPlies });

  const isComplete = moves.length > 0 && evals.length > moves.length;
  return {
    assessments,
    accuracy: isComplete
      ? gameAccuracy(
          evals.slice(0, moves.length + 1).map(whiteWinPercent),
          moves[0].color
        )
      : undefined,
    phases: Object.values(GamePhase).map((phase) => ({
      phase,
      accuracy: {
        white: getPhaseAccuracy(moves, assessments, phase, 'white'),
        black: getPhaseAccuracy(moves, assessments, phase, 'black'),
      },
    })),
    counts: Object.values(MoveLabel).map((label) => ({
      label,
      count: {
        white: countLabel(moves, assessments, label, 'white'),
        black: countLabel(moves, assessments, label, 'black'),
      },
    })),
  };
}

/*
 * Every move is judged from the evaluations of the positions before and after
 * it, so a move stays unassessed until both are known. Gaps are allowed: the
 * line may be evaluated in any order.
 */
export function assessMoves({
  moves,
  evals,
  bookPlies,
}: AssessMovesParams): Array<MoveAssessment | undefined> {
  const phases = getMovePhases(moves);

  return moves.reduce<Array<MoveAssessment | undefined>>(
    (assessed, move, index) => {
      const before = evals[index];
      const after = evals[index + 1];
      if (!before || !after) {
        return [...assessed, undefined];
      }

      const winBefore = toMoverWinPercent(whiteWinPercent(before), move.color);
      const winAfter = toMoverWinPercent(whiteWinPercent(after), move.color);
      const isBest = before.lines[0]?.pv[0] === move.uci;
      const winLoss = isBest ? 0 : Math.max(0, winBefore - winAfter);
      const context: MoveContext = {
        move,
        previousMove: moves[index - 1],
        previousLoss: assessed[index - 1]?.winLoss,
        before,
        winBefore,
        winAfter,
        winLoss,
        isBest,
      };

      return [
        ...assessed,
        {
          label: move.ply <= bookPlies ? MoveLabel.Book : getLabel(context),
          phase: phases[index],
          winBefore,
          winAfter,
          winLoss,
          accuracy: moveAccuracy(winBefore, winBefore - winLoss),
          isBest,
        },
      ];
    },
    []
  );
}

export function isCriticalLabel(label: MoveLabel): boolean {
  return (
    label === MoveLabel.Blunder ||
    label === MoveLabel.Mistake ||
    label === MoveLabel.Miss
  );
}

function getLabel(context: MoveContext): MoveLabel {
  const { winLoss, winAfter, previousLoss, isBest } = context;

  if (isBrilliant(context)) {
    return MoveLabel.Brilliant;
  }
  if (isGreat(context)) {
    return MoveLabel.Great;
  }
  if (isBest) {
    return MoveLabel.Best;
  }
  if (
    (previousLoss ?? 0) >= THRESHOLDS.missMinOpponentLoss &&
    winLoss >= THRESHOLDS.missMinLoss &&
    winAfter >= THRESHOLDS.missMinWinAfter
  ) {
    return MoveLabel.Miss;
  }
  if (winLoss <= THRESHOLDS.excellentMaxLoss) {
    return MoveLabel.Excellent;
  }
  if (winLoss <= THRESHOLDS.goodMaxLoss) {
    return MoveLabel.Good;
  }
  if (winLoss <= THRESHOLDS.inaccuracyMaxLoss) {
    return MoveLabel.Inaccuracy;
  }
  return winLoss <= THRESHOLDS.mistakeMaxLoss
    ? MoveLabel.Mistake
    : MoveLabel.Blunder;
}

/*
 * Brilliant: a (near-)best move that gives up a piece for less than it is
 * worth, keeps the mover about equal or better, and was needed — if the
 * second-best move also wins comfortably, the sacrifice is only style and does
 * not qualify. "About equal" leaves room for the small swings between two
 * searches, so a sound sacrifice in a level position is not lost to noise.
 */
function isBrilliant({
  move,
  before,
  winBefore,
  winAfter,
  winLoss,
}: MoveContext): boolean {
  if (
    winLoss > THRESHOLDS.brilliantMaxLoss ||
    winAfter < THRESHOLDS.brilliantMinWinAfter
  ) {
    return false;
  }
  const alternativeWin =
    getAlternativeWin(before, move.uci, move.color) ?? winBefore;
  return (
    alternativeWin <= THRESHOLDS.brilliantMaxAlternativeWin &&
    getSacrificedMaterial(move) >= THRESHOLDS.brilliantMinSacrifice
  );
}

/*
 * Great: the only move that holds or wins. It needs a second engine line to
 * compare against. Taking the piece the opponent just moved and replying to a
 * check are excluded, because there the only good move is obvious or forced
 * rather than found.
 */
function isGreat({
  move,
  previousMove,
  before,
  winBefore,
  winAfter,
  isBest,
}: MoveContext): boolean {
  const isObvious =
    capturesLastMovedPiece(move, previousMove) ||
    previousMove?.san.endsWith('+') === true;
  if (!isBest || isObvious) {
    return false;
  }
  const alternativeWin = getAlternativeWin(before, move.uci, move.color);
  return (
    alternativeWin !== undefined &&
    alternativeWin <= THRESHOLDS.greatMaxAlternativeWin &&
    winAfter >= THRESHOLDS.greatMinWinAfter &&
    winBefore - alternativeWin >= THRESHOLDS.greatMinGap
  );
}

function getAlternativeWin(
  before: PositionEval,
  playedUci: string,
  mover: PlayerColor
): number | undefined {
  const alternative = before.lines.find((line) => line.pv[0] !== playedUci);
  return alternative
    ? toMoverWinPercent(lineWinPercent(alternative), mover)
    : undefined;
}

function getPhaseAccuracy(
  moves: Array<GameMove>,
  assessments: Array<MoveAssessment | undefined>,
  phase: GamePhase,
  color: PlayerColor
): number | undefined {
  return mean(
    assessments.flatMap((assessment, index) =>
      assessment?.phase === phase && moves[index].color === color
        ? [assessment.accuracy]
        : []
    )
  );
}

function countLabel(
  moves: Array<GameMove>,
  assessments: Array<MoveAssessment | undefined>,
  label: MoveLabel,
  color: PlayerColor
): number {
  return assessments.filter(
    (assessment, index) =>
      assessment?.label === label && moves[index].color === color
  ).length;
}
