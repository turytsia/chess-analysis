export const EMPTY_LINE: BrowseLine = { moves: [], cursor: 0 };

export interface BrowseLine {
  moves: Array<string>;
  cursor: number;
}

export function openLine(moves: Array<string>): BrowseLine {
  return { moves, cursor: moves.length };
}

export function getShownMoves({ moves, cursor }: BrowseLine): Array<string> {
  return moves.slice(0, cursor);
}

export function selectCursor(line: BrowseLine, cursor: number): BrowseLine {
  return {
    ...line,
    cursor: Math.min(Math.max(cursor, 0), line.moves.length),
  };
}

export function stepLine(line: BrowseLine, delta: number): BrowseLine {
  return selectCursor(line, line.cursor + delta);
}

/*
 * Replaying the move that already follows the cursor only moves the cursor,
 * so stepping back and forward never loses the line. A different move starts
 * a new branch there and drops what came after.
 */
export function playSan(line: BrowseLine, san: string): BrowseLine {
  return line.moves[line.cursor] === san
    ? stepLine(line, 1)
    : openLine([...getShownMoves(line), san]);
}
