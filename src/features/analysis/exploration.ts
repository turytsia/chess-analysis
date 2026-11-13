import { createMove, type GameMove } from '../../services/pgn';

export interface NavigationState {
  ply: number;
  variation: Array<GameMove>;
  cursor: number;
}

export interface GameLine {
  moves: Array<GameMove>;
  positions: Array<string>;
}

export function isExploring({ variation }: NavigationState): boolean {
  return variation.length > 0;
}

export function getDisplayedFen(
  { ply, variation, cursor }: NavigationState,
  positions: Array<string>
): string {
  return cursor > 0 ? variation[cursor - 1].fenAfter : positions[ply];
}

export function selectPly(ply: number, lastPly: number): NavigationState {
  return { ply: clamp(ply, 0, lastPly), variation: [], cursor: 0 };
}

export function selectCursor(
  state: NavigationState,
  cursor: number
): NavigationState {
  return { ...state, cursor: clamp(cursor, 0, state.variation.length) };
}

/*
 * The game's own moves always stay the history. Stepping only walks the
 * explored line while the board shows one of its moves; taking back the first
 * explored move lands on the game position, with the line kept in view. From a
 * game position every step follows the game again and drops the explored line,
 * so exploring can never hide or replace a game move.
 */
export function step(
  state: NavigationState,
  delta: number,
  lastPly: number
): NavigationState {
  const isOnExploredMove = state.cursor > 0;
  if (!isOnExploredMove || delta === -Infinity) {
    return selectPly(isOnExploredMove ? 0 : state.ply + delta, lastPly);
  }
  return selectCursor(state, state.cursor + delta);
}

export function canStep(
  { ply, variation, cursor }: NavigationState,
  delta: number,
  lastPly: number
): boolean {
  if (delta < 0) {
    return cursor > 0 || ply > 0;
  }
  return cursor > 0 ? cursor < variation.length : ply < lastPly;
}

/*
 * A move played on the board follows the game or the explored line when it
 * matches their next move, so replaying known moves never creates a branch.
 * Any other legal move starts a variation at the current game position, or
 * replaces everything after the cursor in the variation being explored.
 */
export function playMove(
  state: NavigationState,
  { moves, positions }: GameLine,
  from: string,
  to: string
): NavigationState | undefined {
  const { ply, variation, cursor } = state;
  const move = createMove(
    getDisplayedFen(state, positions),
    from,
    to,
    ply + cursor + 1
  );
  if (!move) {
    return undefined;
  }

  if (cursor === 0 && moves[ply]?.san === move.san) {
    return selectPly(ply + 1, moves.length);
  }
  if (variation[cursor]?.san === move.san) {
    return selectCursor(state, cursor + 1);
  }
  return {
    ply,
    variation: [...variation.slice(0, cursor), move],
    cursor: cursor + 1,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
