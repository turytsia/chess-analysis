import { Chess } from 'chess.js';

const DEFAULT_PROMOTION = 'q';

export interface ResolvedMove {
  san: string;
  fenAfter: string;
}

export interface MoveSquares {
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

export function resolveMove(
  fen: string,
  from: string,
  to: string
): ResolvedMove | undefined {
  try {
    const move = new Chess(fen).move({
      from,
      to,
      promotion: DEFAULT_PROMOTION,
    });
    return { san: move.san, fenAfter: move.after };
  } catch {
    return undefined;
  }
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
