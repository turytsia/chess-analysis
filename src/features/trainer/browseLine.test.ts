import { describe, expect, it } from 'vitest';

import {
  EMPTY_LINE,
  getShownMoves,
  openLine,
  playSan,
  selectCursor,
  stepLine,
} from './browseLine';

describe('browseLine', () => {
  describe('playSan', () => {
    it('should add moves to the end of the line', () => {
      const line = playSan(playSan(EMPTY_LINE, 'e4'), 'c6');

      expect(line).toEqual({ moves: ['e4', 'c6'], cursor: 2 });
    });

    it('should only move forward when the next move of the line is replayed', () => {
      const line = selectCursor(openLine(['e4', 'c6', 'd4', 'd5']), 1);

      expect(playSan(line, 'c6')).toEqual({
        moves: ['e4', 'c6', 'd4', 'd5'],
        cursor: 2,
      });
    });

    it('should drop the rest of the line when a different move is played', () => {
      const line = selectCursor(openLine(['e4', 'c6', 'd4', 'd5']), 2);

      expect(playSan(line, 'Nc3')).toEqual({
        moves: ['e4', 'c6', 'Nc3'],
        cursor: 3,
      });
    });
  });

  describe('stepLine', () => {
    it('should move back and forward without changing the line', () => {
      const line = openLine(['e4', 'c6', 'd4']);

      expect(stepLine(line, -1)).toEqual({ moves: line.moves, cursor: 2 });
      expect(stepLine(stepLine(line, -2), 1)).toEqual({
        moves: line.moves,
        cursor: 2,
      });
    });

    it('should stop at the start and at the end of the line', () => {
      const line = openLine(['e4', 'c6', 'd4']);

      expect(stepLine(line, 1).cursor).toBe(3);
      expect(stepLine(line, -Infinity).cursor).toBe(0);
      expect(stepLine(stepLine(line, -Infinity), Infinity).cursor).toBe(3);
    });
  });

  describe('getShownMoves', () => {
    it('should return the moves up to the cursor', () => {
      const line = selectCursor(openLine(['e4', 'c6', 'd4']), 2);

      expect(getShownMoves(line)).toEqual(['e4', 'c6']);
    });
  });

  describe('openLine', () => {
    it('should show the last move of the line', () => {
      expect(openLine(['e4', 'c6'])).toEqual({
        moves: ['e4', 'c6'],
        cursor: 2,
      });
    });
  });
});
