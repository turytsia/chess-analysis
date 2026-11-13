import { Chess, type Move, type PieceSymbol } from 'chess.js';

import type { PlayerColor } from './evaluation';

const GAME_BOUNDARY = /\r?\n\s*\r?\n(?=\[)/;
const HEADER_LINE = /^\s*\[/;
const DEFAULT_PROMOTION = 'q';

export interface GameMove {
  ply: number;
  color: PlayerColor;
  san: string;
  uci: string;
  from: string;
  to: string;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  fenBefore: string;
  fenAfter: string;
}

export interface ParsedGame {
  headers: Record<string, string>;
  moves: Array<GameMove>;
  startFen: string;
}

export function parsePgn(pgn: string): ParsedGame {
  const chess = new Chess();
  chess.loadPgn(pgn.trim());

  const moves = chess
    .history({ verbose: true })
    .map((move, index) => toGameMove(move, index + 1));

  return {
    headers: chess.getHeaders(),
    moves,
    startFen: moves[0]?.fenBefore ?? chess.fen(),
  };
}

/*
 * A PGN file separates the header block from the movetext with a blank line,
 * and games from each other the same way. A new game therefore starts at a
 * blank line followed by a header, but only once the current chunk already has
 * movetext; otherwise that blank line just sits between a game's own sections.
 */
export function splitPgn(text: string): Array<string> {
  return text
    .trim()
    .split(GAME_BOUNDARY)
    .reduce<Array<string>>((games, chunk) => {
      const previous = games[games.length - 1];
      const isPreviousComplete =
        previous !== undefined && hasMovetext(previous);
      return previous === undefined || isPreviousComplete
        ? [...games, chunk]
        : [...games.slice(0, -1), `${previous}\n\n${chunk}`];
    }, [])
    .filter((game) => game.trim().length > 0);
}

export function createMove(
  fen: string,
  from: string,
  to: string,
  ply: number
): GameMove | undefined {
  try {
    const move = new Chess(fen).move({
      from,
      to,
      promotion: DEFAULT_PROMOTION,
    });
    return toGameMove(move, ply);
  } catch {
    return undefined;
  }
}

export function getPositions(game: ParsedGame): Array<string> {
  return [game.startFen, ...game.moves.map((move) => move.fenAfter)];
}

function hasMovetext(chunk: string): boolean {
  return chunk
    .split(/\r?\n/)
    .some((line) => line.trim().length > 0 && !HEADER_LINE.test(line));
}

function toGameMove(move: Move, ply: number): GameMove {
  return {
    ply,
    color: move.color === 'w' ? 'white' : 'black',
    san: move.san,
    uci: move.lan,
    from: move.from,
    to: move.to,
    piece: move.piece,
    captured: move.captured,
    promotion: move.promotion,
    fenBefore: move.before,
    fenAfter: move.after,
  };
}
