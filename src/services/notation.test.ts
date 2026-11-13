import { describe, expect, it } from 'vitest';

import {
  getLinePositions,
  getMoveSquares,
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

  describe('getLinePositions', () => {
    it('should return the start position and one position per move', () => {
      expect(getLinePositions(['e4'])).toEqual([START, AFTER_E4]);
    });
  });

  describe('getMoveSquares', () => {
    it('should find the squares a move goes from and to', () => {
      expect(getMoveSquares(START, 'Nf3')).toEqual({ from: 'g1', to: 'f3' });
    });

    it('should return nothing for a move that cannot be played', () => {
      expect(getMoveSquares(START, 'Nf6')).toBeUndefined();
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
});
