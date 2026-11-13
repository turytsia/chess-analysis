import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';

import type { GameMove } from './pgn';

export const PIECE_VALUES: Record<PieceSymbol, number> = {
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
const NO_EXCHANGE: Exchange = { total: 0, pieces: 0 };

export enum GamePhase {
  Opening = 'opening',
  Middlegame = 'middlegame',
  Endgame = 'endgame',
}

interface Exchange {
  total: number;
  pieces: number;
}

interface PieceAtRisk extends Exchange {
  piece: PieceSymbol;
  square: Square;
}

interface Sacrifice {
  piece: PieceSymbol;
  square: Square;
  material: number;
}

/*
 * The piece the mover gives up and how much material that costs, in pawn
 * units. After the move the opponent's best static exchange is found for every
 * mover's piece, and whatever the move itself captured is subtracted, so an
 * even trade is no sacrifice. Only a deficit in pieces counts: a knight for
 * two pawns is a sacrifice of one point, while trading rooks and losing a pawn
 * on the way is not a sacrifice at all.
 */
export function getSacrifice(move: GameMove): Sacrifice | undefined {
  if (new Chess(move.fenAfter).isGameOver()) {
    return undefined;
  }

  const taken: Exchange = {
    total:
      (move.captured ? PIECE_VALUES[move.captured] : 0) +
      (move.promotion ? PIECE_VALUES[move.promotion] - PIECE_VALUES.p : 0),
    pieces:
      (move.captured ? getPieceValue(move.captured) : 0) +
      (move.promotion ? PIECE_VALUES[move.promotion] : 0),
  };
  return getPiecesAtRisk(move.fenAfter)
    .filter(({ pieces, total }) => pieces > taken.pieces && total > taken.total)
    .map(({ piece, square, total }) => ({
      piece,
      square,
      material: total - taken.total,
    }))
    .reduce<Sacrifice | undefined>(
      (largest, sacrifice) =>
        largest && largest.material >= sacrifice.material ? largest : sacrifice,
      undefined
    );
}

/*
 * Pieces of the side that is not to move which the side to move can win
 * material on, judged by a static exchange on the piece's square. Pawns and
 * the king are left out.
 */
export function getPiecesAtRisk(fen: string): Array<PieceAtRisk> {
  const chess = new Chess(fen);
  const owner = chess.turn() === 'w' ? 'b' : 'w';
  const attackedSquares = new Set(
    chess
      .moves({ verbose: true })
      .filter((move) => move.captured !== undefined)
      .map((move) => move.to)
  );
  return chess
    .board()
    .flat()
    .flatMap((piece) => {
      if (
        piece === null ||
        piece.color !== owner ||
        piece.type === 'p' ||
        piece.type === 'k' ||
        !attackedSquares.has(piece.square)
      ) {
        return [];
      }
      const exchange = getExchange(chess, piece.square);
      return exchange.total > 0
        ? [{ piece: piece.type, square: piece.square, ...exchange }]
        : [];
    });
}

/*
 * Material the side to move wins by starting an exchange on the square, or
 * zero when capturing there does not pay.
 */
export function getExchangeGain(fen: string, square: string): number {
  return getExchange(new Chess(fen), square as Square).total;
}

export function capturesLastMovedPiece(
  move: GameMove,
  previous: GameMove | undefined
): boolean {
  return move.captured !== undefined && previous?.to === move.to;
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
 * side may stop when continuing would not win material. Legal moves are used,
 * so pins and x-ray attackers are handled by the move generator. Next to the
 * total, the part of it that is made of pieces rather than pawns is tracked.
 */
function getExchange(chess: Chess, square: Square): Exchange {
  const [capture] = chess
    .moves({ verbose: true })
    .filter((move) => move.to === square && move.captured !== undefined)
    .sort((a, b) => getAttackerValue(a) - getAttackerValue(b));
  if (!capture?.captured) {
    return NO_EXCHANGE;
  }

  chess.move(capture);
  const reply = getExchange(chess, capture.to);
  chess.undo();
  const total = PIECE_VALUES[capture.captured] - reply.total;
  return total > 0
    ? { total, pieces: getPieceValue(capture.captured) - reply.pieces }
    : NO_EXCHANGE;
}

function getPieceValue(piece: PieceSymbol): number {
  return piece === 'p' ? 0 : PIECE_VALUES[piece];
}

function getAttackerValue(move: Move): number {
  return PIECE_VALUES[move.piece];
}
