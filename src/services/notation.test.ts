import { describe, expect, it } from 'vitest';

import {
  getLegalTargets,
  getPieceColor,
  getSideToMove,
  toSanLine,
} from './notation';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('notation', () => {
  describe('toSanLine', () => {
    it('should convert engine moves to notation up to the limit', () => {
      expect(toSanLine(START, ['e2e4', 'c7c6', 'd2d4'], 2)).toEqual([
        'e4',
        'c6',
      ]);
    });

    it('should stop at the first move that cannot be played', () => {
      expect(toSanLine(START, ['e2e4', 'e2e4', 'd2d4'], 8)).toEqual(['e4']);
    });
  });

  describe('getSideToMove', () => {
    it('should read the side to move from the position', () => {
      expect(getSideToMove(START)).toBe('white');
      expect(getSideToMove(AFTER_E4)).toBe('black');
    });
  });

  describe('getPieceColor', () => {
    it('should tell whose piece stands on a square', () => {
      expect(getPieceColor(START, 'e2')).toBe('white');
      expect(getPieceColor(START, 'e7')).toBe('black');
    });

    it('should return nothing for an empty or unknown square', () => {
      expect(getPieceColor(START, 'e4')).toBeUndefined();
      expect(getPieceColor(START, 'z9')).toBeUndefined();
    });
  });
  describe('getLegalTargets', () => {
    it('should list the squares a piece can move to', () => {
      expect(getLegalTargets(START, 'g1')).toEqual([
        { square: 'f3', isOccupied: false },
        { square: 'h3', isOccupied: false },
      ]);
    });

    it('should mark the squares where a piece is taken', () => {
      const targets = getLegalTargets(
        'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        'e4'
      );

      expect(targets).toEqual([
        { square: 'e5', isOccupied: false },
        { square: 'd5', isOccupied: true },
      ]);
    });

    it('should treat the empty square of an en passant capture as free', () => {
      const targets = getLegalTargets(
        'rnbqkbnr/ppp1pppp/8/8/3pP3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 3',
        'd4'
      );

      expect(targets).toContainEqual({ square: 'e3', isOccupied: false });
    });

    it('should list a promotion square once', () => {
      expect(getLegalTargets('8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', 'e7')).toEqual([
        { square: 'e8', isOccupied: false },
      ]);
    });

    it('should have no targets for a piece of the side that is not to move', () => {
      expect(getLegalTargets(START, 'g8')).toEqual([]);
    });
  });
});
