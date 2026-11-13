import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';

import type { GameMove } from './pgn';

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};
const MAJORS_AND_MINORS = /[nbrq]/gi;
const BACK_RANK_MIN_PIECES = 4;
const OPENING_MAX_MAJORS_AND_MINORS = 10;
const ENDGAME_MAX_MAJORS_AND_MINORS = 6;
const OPENING_MAX_PLY = 30;

export enum GamePhase {
  Opening = 'opening',
  Middlegame = 'middlegame',
  Endgame = 'endgame',
}

/*
 * Net material the mover leaves for the opponent to win, in pawn units. After
 * the move the opponent's best static exchange is found for every mover's
 * piece, and whatever the move itself captured is subtracted, so an even trade
 * comes out as zero and a real sacrifice as a positive number.
 */
export function getSacrificedMaterial(move: GameMove): number {
  const chess = new Chess(move.fenAfter);
  if (chess.isGameOver()) {
    return 0;
  }

  const moverColor = move.color === 'white' ? 'w' : 'b';
  const offered = chess
    .board()
    .flat()
    .filter(
      (piece) =>
        piece !== null &&
        piece.color === moverColor &&
        piece.type !== 'p' &&
        piece.type !== 'k'
    )
    .reduce(
      (most, piece) =>
        piece ? Math.max(most, getExchangeGain(chess, piece.square)) : most,
      0
    );

  const captured = move.captured ? PIECE_VALUES[move.captured] : 0;
  const promoted = move.promotion
    ? PIECE_VALUES[move.promotion] - PIECE_VALUES.p
    : 0;
  return offered - captured - promoted;
}

export function isRecapture(
  move: GameMove,
  previous: GameMove | undefined
): boolean {
  return (
    move.captured !== undefined &&
    previous?.captured !== undefined &&
    previous.to === move.to
  );
}

export function getMovePhases(moves: Array<GameMove>): Array<GamePhase> {
  return moves.reduce<Array<GamePhase>>((phases, move) => {
    const previous = phases[phases.length - 1] ?? GamePhase.Opening;
    return [...phases, getNextPhase(previous, move)];
  }, []);
}

function getNextPhase(previous: GamePhase, move: GameMove): GamePhase {
  const [placement] = move.fenAfter.split(' ');
  const majorsAndMinors = placement.match(MAJORS_AND_MINORS)?.length ?? 0;

  if (
    previous === GamePhase.Endgame ||
    majorsAndMinors <= ENDGAME_MAX_MAJORS_AND_MINORS
  ) {
    return GamePhase.Endgame;
  }
  const hasLeftOpening =
    previous === GamePhase.Middlegame ||
    majorsAndMinors <= OPENING_MAX_MAJORS_AND_MINORS ||
    move.ply > OPENING_MAX_PLY ||
    isBackRankSparse(placement);
  return hasLeftOpening ? GamePhase.Middlegame : GamePhase.Opening;
}

function isBackRankSparse(placement: string): boolean {
  const ranks = placement.split('/');
  const blackBackRank = ranks[0].match(/[nbrqk]/g)?.length ?? 0;
  const whiteBackRank = ranks[7].match(/[NBRQK]/g)?.length ?? 0;
  return (
    blackBackRank < BACK_RANK_MIN_PIECES || whiteBackRank < BACK_RANK_MIN_PIECES
  );
}

/*
 * Static exchange evaluation: the side to move captures on the square with its
 * least valuable piece, the other side recaptures the same way, and either
 * side may stop when continuing would lose material. Legal moves are used, so
 * pins and x-ray attackers are handled by the move generator.
 */
function getExchangeGain(chess: Chess, square: Square): number {
  const [capture] = chess
    .moves({ verbose: true })
    .filter((move) => move.to === square && move.captured !== undefined)
    .sort((a, b) => getAttackerValue(a) - getAttackerValue(b));
  if (!capture?.captured) {
    return 0;
  }

  chess.move(capture);
  const gain =
    PIECE_VALUES[capture.captured] - getExchangeGain(chess, capture.to);
  chess.undo();
  return Math.max(0, gain);
}

function getAttackerValue(move: Move): number {
  return PIECE_VALUES[move.piece];
}
