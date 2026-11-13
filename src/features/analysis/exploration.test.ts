import { describe, expect, it } from 'vitest';

import { getPositions, parsePgn } from '../../services/pgn';
import {
  canStep,
  getDisplayedFen,
  isExploring,
  playMove,
  selectCursor,
  selectPly,
  step,
  type GameLine,
  type NavigationState,
} from './exploration';

const PARSED = parsePgn('1. e4 c6 2. d4 d5 *');
const GAME: GameLine = { moves: PARSED.moves, positions: getPositions(PARSED) };
const LAST_PLY = GAME.moves.length;
const AFTER_E4_E5 =
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

function exploredFrom(
  ply: number,
  ...squares: Array<[string, string]>
): NavigationState {
  return squares.reduce<NavigationState>((state, [from, to]) => {
    const next = playMove(state, GAME, from, to);
    if (!next) {
      throw new Error(`Illegal move ${from}${to}`);
    }
    return next;
  }, selectPly(ply, LAST_PLY));
}

describe('exploration', () => {
  describe('playMove', () => {
    it('should follow the game when the move played is the game move', () => {
      const next = playMove(selectPly(0, LAST_PLY), GAME, 'e2', 'e4');

      expect(next).toEqual({ ply: 1, variation: [], cursor: 0 });
    });

    it('should start a variation when the move differs from the game', () => {
      const next = playMove(selectPly(1, LAST_PLY), GAME, 'e7', 'e5');

      expect(next).toMatchObject({
        ply: 1,
        variation: [
          {
            ply: 2,
            color: 'black',
            san: 'e5',
            uci: 'e7e5',
            from: 'e7',
            to: 'e5',
            fenAfter: AFTER_E4_E5,
          },
        ],
        cursor: 1,
      });
    });

    it('should extend the variation with every further move', () => {
      const state = exploredFrom(1, ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6']);

      expect(state.variation.map(({ san }) => san)).toEqual([
        'e5',
        'Nf3',
        'Nc6',
      ]);
      expect(state.variation.map(({ ply }) => ply)).toEqual([2, 3, 4]);
      expect(state.cursor).toBe(3);
      expect(state.ply).toBe(1);
    });

    it('should keep a game move inside the variation once exploring', () => {
      const state = exploredFrom(1, ['e7', 'e5'], ['d2', 'd4']);

      expect(state.variation.map(({ san }) => san)).toEqual(['e5', 'd4']);
      expect(state.ply).toBe(1);
    });

    it('should move along the variation when its next move is replayed', () => {
      const explored = exploredFrom(1, ['e7', 'e5'], ['g1', 'f3']);

      const next = playMove(selectCursor(explored, 1), GAME, 'g1', 'f3');

      expect(next).toEqual({ ...explored, cursor: 2 });
    });

    it('should replace the rest of the variation when a different move is played', () => {
      const explored = exploredFrom(
        1,
        ['e7', 'e5'],
        ['g1', 'f3'],
        ['b8', 'c6']
      );

      const next = playMove(selectCursor(explored, 1), GAME, 'f1', 'c4');

      expect(next?.variation.map(({ san }) => san)).toEqual(['e5', 'Bc4']);
      expect(next?.cursor).toBe(2);
    });

    it('should follow the game when the game move is played from the game position of an explored line', () => {
      const atGamePosition = selectCursor(exploredFrom(1, ['e7', 'e5']), 0);

      expect(playMove(atGamePosition, GAME, 'c7', 'c6')).toEqual({
        ply: 2,
        variation: [],
        cursor: 0,
      });
    });

    it('should branch from the game position when stepped back to the start of the variation', () => {
      const explored = exploredFrom(1, ['e7', 'e5'], ['g1', 'f3']);

      const next = playMove(selectCursor(explored, 0), GAME, 'd7', 'd5');

      expect(next?.variation.map(({ san }) => san)).toEqual(['d5']);
    });

    it('should reject an illegal move', () => {
      expect(
        playMove(selectPly(0, LAST_PLY), GAME, 'e2', 'e5')
      ).toBeUndefined();
    });
  });

  describe('step', () => {
    it('should move through the game when not exploring', () => {
      expect(step(selectPly(1, LAST_PLY), 1, LAST_PLY).ply).toBe(2);
      expect(step(selectPly(1, LAST_PLY), -1, LAST_PLY).ply).toBe(0);
    });

    it('should stay within the game', () => {
      expect(step(selectPly(0, LAST_PLY), -1, LAST_PLY).ply).toBe(0);
      expect(step(selectPly(LAST_PLY, LAST_PLY), 1, LAST_PLY).ply).toBe(
        LAST_PLY
      );
      expect(step(selectPly(2, LAST_PLY), Infinity, LAST_PLY).ply).toBe(
        LAST_PLY
      );
    });

    it('should move through the explored line while the board shows one of its moves', () => {
      const explored = exploredFrom(1, ['e7', 'e5'], ['g1', 'f3']);

      expect(step(explored, -1, LAST_PLY)).toMatchObject({ ply: 1, cursor: 1 });
      expect(step(selectCursor(explored, 1), 1, LAST_PLY)).toMatchObject({
        ply: 1,
        cursor: 2,
      });
      expect(step(explored, 1, LAST_PLY)).toMatchObject({ ply: 1, cursor: 2 });
    });

    it('should land on the game position, keeping the line, when the first explored move is taken back', () => {
      const explored = exploredFrom(1, ['e7', 'e5']);

      const atGamePosition = step(explored, -1, LAST_PLY);

      expect(atGamePosition).toMatchObject({ ply: 1, cursor: 0 });
      expect(isExploring(atGamePosition)).toBe(true);
    });

    it('should follow the game again from the game position and drop the explored line', () => {
      const atGamePosition = selectCursor(
        exploredFrom(1, ['e7', 'e5'], ['g1', 'f3']),
        0
      );

      expect(step(atGamePosition, 1, LAST_PLY)).toEqual({
        ply: 2,
        variation: [],
        cursor: 0,
      });
      expect(step(atGamePosition, -1, LAST_PLY)).toEqual({
        ply: 0,
        variation: [],
        cursor: 0,
      });
    });

    it('should jump from an explored move to the start of the game', () => {
      const explored = exploredFrom(2, ['g1', 'f3'], ['d7', 'd5']);

      expect(step(explored, -Infinity, LAST_PLY)).toEqual({
        ply: 0,
        variation: [],
        cursor: 0,
      });
    });

    it('should jump to the end of the explored line', () => {
      const explored = selectCursor(
        exploredFrom(1, ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6']),
        1
      );

      expect(step(explored, Infinity, LAST_PLY)).toMatchObject({ cursor: 3 });
    });
  });

  describe('canStep', () => {
    it('should follow the limits of the game when not exploring', () => {
      expect(canStep(selectPly(0, LAST_PLY), -1, LAST_PLY)).toBe(false);
      expect(canStep(selectPly(0, LAST_PLY), 1, LAST_PLY)).toBe(true);
      expect(canStep(selectPly(LAST_PLY, LAST_PLY), 1, LAST_PLY)).toBe(false);
    });

    it('should allow stepping back out of the explored line into the game', () => {
      const explored = exploredFrom(1, ['e7', 'e5']);

      expect(canStep(explored, -1, LAST_PLY)).toBe(true);
      expect(canStep(selectCursor(explored, 0), -1, LAST_PLY)).toBe(true);
    });

    it('should stop at the end of the explored line', () => {
      const explored = exploredFrom(1, ['e7', 'e5']);

      expect(canStep(explored, 1, LAST_PLY)).toBe(false);
      expect(canStep(selectCursor(explored, 0), 1, LAST_PLY)).toBe(true);
    });
  });

  describe('selectPly', () => {
    it('should drop the variation and return to the game', () => {
      const explored = exploredFrom(1, ['e7', 'e5']);

      expect(isExploring(explored)).toBe(true);
      expect(selectPly(explored.ply, LAST_PLY)).toEqual({
        ply: 1,
        variation: [],
        cursor: 0,
      });
    });
  });

  describe('getDisplayedFen', () => {
    it('should show the game position when not exploring', () => {
      expect(getDisplayedFen(selectPly(1, LAST_PLY), GAME.positions)).toBe(
        GAME.positions[1]
      );
    });

    it('should show the explored position at the cursor', () => {
      const explored = exploredFrom(1, ['e7', 'e5'], ['g1', 'f3']);

      expect(getDisplayedFen(selectCursor(explored, 1), GAME.positions)).toBe(
        AFTER_E4_E5
      );
      expect(getDisplayedFen(selectCursor(explored, 0), GAME.positions)).toBe(
        GAME.positions[1]
      );
    });
  });
});
