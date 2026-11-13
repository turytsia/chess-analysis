import { Chess, type Square } from 'chess.js';

import type { PlayerColor } from './evaluation';

const SQUARE_PATTERN = /^[a-h][1-8]$/;

interface MoveSquares {
  from: string;
  to: string;
}

export function toSanLine(
  fen: string,
  uciMoves: Array<string>,
  limit: number
): Array<string> {
  const chess = new Chess(fen);
  const sans: Array<string> = [];
  for (const uci of uciMoves.slice(0, limit)) {
    try {
      sans.push(
        chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.slice(4, 5) || undefined,
        }).san
      );
    } catch {
      break;
    }
  }
  return sans;
}

export function getLinePositions(sans: Array<string>): Array<string> {
  const chess = new Chess();
  return [chess.fen(), ...sans.map((san) => chess.move(san).after)];
}

export function getMoveSquares(
  fen: string,
  san: string
): MoveSquares | undefined {
  try {
    const { from, to } = new Chess(fen).move(san);
    return { from, to };
  } catch {
    return undefined;
  }
}

export function getSideToMove(fen: string): PlayerColor {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

export function getPieceColor(
  fen: string,
  square: string
): PlayerColor | undefined {
  if (!isSquare(square)) {
    return undefined;
  }
  const piece = new Chess(fen).get(square);
  if (!piece) {
    return undefined;
  }
  return piece.color === 'w' ? 'white' : 'black';
}

function isSquare(value: string): value is Square {
  return SQUARE_PATTERN.test(value);
}
