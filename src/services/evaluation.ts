const WIN_PERCENT_SLOPE = 0.00368208;
const ACCURACY_SCALE = 103.1668100711649;
const ACCURACY_DECAY = 0.04354415386753951;
const ACCURACY_OFFSET = 3.166924740191411;
const ACCURACY_UNCERTAINTY_BONUS = 1;
const MIN_ACCURACY_WINDOW = 2;
const MAX_ACCURACY_WINDOW = 8;
const MIN_VOLATILITY_WEIGHT = 0.5;
const MAX_VOLATILITY_WEIGHT = 12;

export type PlayerColor = 'white' | 'black';

type PositionOutcome = 'whiteWins' | 'blackWins' | 'draw';

export interface EvalLine {
  cp?: number;
  mate?: number;
  depth: number;
  pv: Array<string>;
}

export interface PositionEval {
  lines: Array<EvalLine>;
  outcome?: PositionOutcome;
}

export interface SideValues<T> {
  white: T;
  black: T;
}

export function lineWinPercent(line: EvalLine): number {
  if (line.mate !== undefined) {
    return line.mate > 0 ? 100 : 0;
  }
  return (
    50 + 50 * (2 / (1 + Math.exp(-WIN_PERCENT_SLOPE * (line.cp ?? 0))) - 1)
  );
}

export function whiteWinPercent(evaluation: PositionEval): number {
  if (evaluation.outcome === 'whiteWins') {
    return 100;
  }
  if (evaluation.outcome === 'blackWins') {
    return 0;
  }
  const [bestLine] = evaluation.lines;
  return bestLine ? lineWinPercent(bestLine) : 50;
}

export function toMoverWinPercent(
  whiteWin: number,
  mover: PlayerColor
): number {
  return mover === 'white' ? whiteWin : 100 - whiteWin;
}

export function moveAccuracy(winBefore: number, winAfter: number): number {
  if (winAfter >= winBefore) {
    return 100;
  }
  const raw =
    ACCURACY_SCALE * Math.exp(-ACCURACY_DECAY * (winBefore - winAfter)) -
    ACCURACY_OFFSET +
    ACCURACY_UNCERTAINTY_BONUS;
  return clamp(raw, 0, 100);
}

/*
 * Game accuracy follows the Lichess model: every move's accuracy is weighted
 * by how volatile the win probability is around it (standard deviation over a
 * sliding window), and the result is the mean of that weighted average and the
 * harmonic mean, which punishes a few terrible moves more than a plain average.
 */
export function gameAccuracy(
  whiteWinPercents: Array<number>,
  firstMover: PlayerColor
): SideValues<number> | undefined {
  const moveCount = whiteWinPercents.length - 1;
  if (moveCount < 2) {
    return undefined;
  }

  const windowSize = clamp(
    Math.floor(moveCount / 10),
    MIN_ACCURACY_WINDOW,
    MAX_ACCURACY_WINDOW
  );
  const leadingWindows = Array.from(
    { length: Math.min(windowSize, whiteWinPercents.length) - 2 },
    () => whiteWinPercents.slice(0, windowSize)
  );
  const weights = [
    ...leadingWindows,
    ...slidingWindows(whiteWinPercents, windowSize),
  ].map((window) =>
    clamp(
      standardDeviation(window),
      MIN_VOLATILITY_WEIGHT,
      MAX_VOLATILITY_WEIGHT
    )
  );

  const weighted = Array.from({ length: moveCount }, (_, index) => {
    const mover = moverAt(index, firstMover);
    return {
      mover,
      weight: weights[index] ?? MIN_VOLATILITY_WEIGHT,
      accuracy: moveAccuracy(
        toMoverWinPercent(whiteWinPercents[index], mover),
        toMoverWinPercent(whiteWinPercents[index + 1], mover)
      ),
    };
  });

  const white = sideAccuracy(weighted.filter(({ mover }) => mover === 'white'));
  const black = sideAccuracy(weighted.filter(({ mover }) => mover === 'black'));
  return white === undefined || black === undefined
    ? undefined
    : { white, black };
}

export function moverAt(index: number, firstMover: PlayerColor): PlayerColor {
  return (index % 2 === 0) === (firstMover === 'white') ? 'white' : 'black';
}

export function mean(values: Array<number>): number | undefined {
  return values.length === 0
    ? undefined
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sideAccuracy(
  moves: Array<{ accuracy: number; weight: number }>
): number | undefined {
  if (moves.length === 0) {
    return undefined;
  }
  const totalWeight = moves.reduce((sum, { weight }) => sum + weight, 0);
  const weightedMean =
    moves.reduce((sum, { accuracy, weight }) => sum + accuracy * weight, 0) /
    totalWeight;
  const harmonicMean =
    moves.length /
    moves.reduce((sum, { accuracy }) => sum + 1 / Math.max(accuracy, 1), 0);
  return (weightedMean + harmonicMean) / 2;
}

function slidingWindows(
  values: Array<number>,
  size: number
): Array<Array<number>> {
  return Array.from({ length: Math.max(values.length - size + 1, 0) }, (_, i) =>
    values.slice(i, i + size)
  );
}

function standardDeviation(values: Array<number>): number {
  const average = mean(values) ?? 0;
  const variance = mean(values.map((value) => (value - average) ** 2)) ?? 0;
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
