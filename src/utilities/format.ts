import { format } from 'date-fns';

import type { PositionEval } from '../services/evaluation';

const DATE_FORMAT = 'MMM d, yyyy';
const CENTIPAWNS_PER_PAWN = 100;
const DEFAULT_EVAL_DIGITS = 2;
const SECONDS_PER_MINUTE = 60;
const CLOCK_TIME_CONTROL = /^(\d+)(?:\+(\d+))?$/;
const OUTCOME_TEXT = {
  whiteWins: '1-0',
  blackWins: '0-1',
  draw: '½-½',
} as const;

export function formatEval(
  evaluation: PositionEval | undefined,
  fractionDigits: number = DEFAULT_EVAL_DIGITS
): string {
  if (evaluation?.outcome) {
    return OUTCOME_TEXT[evaluation.outcome];
  }
  const line = evaluation?.lines[0];
  if (!line) {
    return '–';
  }
  if (line.mate !== undefined) {
    return `${line.mate < 0 ? '-' : ''}M${Math.abs(line.mate)}`;
  }
  const pawns = (line.cp ?? 0) / CENTIPAWNS_PER_PAWN;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(fractionDigits)}`;
}

export function formatMoveNumber(ply: number): string {
  const moveNumber = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${moveNumber}.` : `${moveNumber}…`;
}

export function formatMoveLine(sans: Array<string>, firstPly: number): string {
  return sans
    .map((san, index) => {
      const ply = firstPly + index;
      return index === 0 || ply % 2 === 1
        ? `${formatMoveNumber(ply)} ${san}`
        : san;
    })
    .join(' ');
}

export function formatPercent(value: number): string {
  return value.toFixed(1);
}

export function formatDate(timestamp: number): string {
  return format(timestamp, DATE_FORMAT);
}

export function formatTimeControl(
  timeControl: string | undefined
): string | undefined {
  const clock = timeControl && CLOCK_TIME_CONTROL.exec(timeControl);
  if (!clock) {
    return undefined;
  }
  const [, base, increment = '0'] = clock;
  const seconds = Number(base);
  const minutes = seconds / SECONDS_PER_MINUTE;
  return Number.isInteger(minutes)
    ? `${minutes}+${increment}`
    : `${seconds}s+${increment}`;
}
