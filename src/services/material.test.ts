import { describe, expect, it } from 'vitest';

import {
  capturesLastMovedPiece,
  GamePhase,
  getMovePhases,
  getSacrifice,
} from './material';
import { parsePgn } from './pgn';

describe('material', () => {
  describe('getSacrifice', () => {
    it('should count a bishop given up for a pawn as two points', () => {
      const { moves } = parsePgn(
        '[SetUp "1"]\n[FEN "6k1/5ppp/8/8/8/3B4/5PPP/6K1 w - - 0 1"]\n\n1. Bxh7+ *'
      );

      expect(getSacrifice(moves[0])?.material).toBe(2);
    });

    it('should count a queen left en prise as nine points', () => {
      const { moves } = parsePgn(
        '[SetUp "1"]\n[FEN "6k1/5ppp/8/8/8/8/1q3PPP/3Q2K1 w - - 0 1"]\n\n1. Qd2 *'
      );

      expect(getSacrifice(moves[0])?.material).toBe(9);
    });

    it('should not count a defended piece as a sacrifice', () => {
      const { moves } = parsePgn('1. e4 e5 2. Nf3 Nc6 3. Bb5 *');

      expect(getSacrifice(moves[4])).toBeUndefined();
    });

    it('should count a knight given up for two pawns as one point', () => {
      const { moves } = parsePgn(
        '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 d6 6. Bg5 h6 7. Bh4 g5 8. Nxg5 *'
      );

      expect(getSacrifice(moves[14])?.material).toBe(1);
    });

    it('should count a rook given up for a knight and a pawn as one point', () => {
      const { moves } = parsePgn(
        '[SetUp "1"]\n[FEN "6k1/5pp1/5n1p/8/8/2Q5/6PP/5RK1 w - - 0 1"]\n\n1. Rxf6 *'
      );

      expect(getSacrifice(moves[0])?.material).toBe(1);
    });

    it('should not count an even trade as a sacrifice', () => {
      const { moves } = parsePgn(
        '[SetUp "1"]\n[FEN "3r2k1/3r1ppp/8/8/8/8/3R1PPP/3R2K1 w - - 0 1"]\n\n1. Rxd7 *'
      );

      expect(getSacrifice(moves[0])).toBeUndefined();
    });

    it('should not count a trade that only loses a pawn as a sacrifice', () => {
      const { moves } = parsePgn(
        '[SetUp "1"]\n[FEN "3r2k1/3r1ppp/8/8/8/2P5/5PPP/3R2K1 w - - 0 1"]\n\n1. Rd4 *'
      );

      expect(getSacrifice(moves[0])).toBeUndefined();
    });

    it('should not count material offered by a move that ends the game', () => {
      const { moves } = parsePgn(
        '[SetUp "1"]\n[FEN "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1"]\n\n1. Rd8# *'
      );

      expect(getSacrifice(moves[0])).toBeUndefined();
    });
  });

  describe('capturesLastMovedPiece', () => {
    it('should be true when a piece is taken back on the same square', () => {
      const { moves } = parsePgn('1. e4 d5 2. exd5 Qxd5 *');

      expect(capturesLastMovedPiece(moves[3], moves[2])).toBe(true);
    });

    it('should be true when a piece that was just put en prise is taken', () => {
      const { moves } = parsePgn('1. e4 e5 2. Nf3 Ba3 3. bxa3 *');

      expect(capturesLastMovedPiece(moves[4], moves[3])).toBe(true);
    });

    it('should be false for a capture somewhere else', () => {
      const { moves } = parsePgn('1. e4 d5 2. Nf3 dxe4 *');

      expect(capturesLastMovedPiece(moves[3], moves[2])).toBe(false);
    });

    it('should be false for a move that takes nothing', () => {
      const { moves } = parsePgn('1. e4 d5 *');

      expect(capturesLastMovedPiece(moves[1], moves[0])).toBe(false);
    });
  });

  describe('getMovePhases', () => {
    it('should start in the opening', () => {
      const { moves } = parsePgn('1. e4 e5 2. Nf3 Nc6 *');

      expect(getMovePhases(moves)).toEqual([
        GamePhase.Opening,
        GamePhase.Opening,
        GamePhase.Opening,
        GamePhase.Opening,
      ]);
    });

    it('should reach the endgame once few pieces are left and stay there', () => {
      const { moves } = parsePgn(
        '[SetUp "1"]\n[FEN "3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1"]\n\n1. Rxd8# *'
      );

      expect(getMovePhases(moves)).toEqual([GamePhase.Endgame]);
    });

    it('should leave the opening when a back rank is nearly empty', () => {
      const { moves } = parsePgn(
        '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Nc3 Nf6 5. d3 d6 6. Be3 Be6 7. Qe2 Qe7 8. O-O-O *'
      );

      expect(getMovePhases(moves).at(-1)).toBe(GamePhase.Middlegame);
    });
  });
});
