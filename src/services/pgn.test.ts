import { describe, expect, it } from 'vitest';

import { createMove, getPositions, parsePgn, splitPgn } from './pgn';

describe('pgn', () => {
  describe('parsePgn', () => {
    it('should read headers and moves with positions before and after', () => {
      const game = parsePgn(
        '[White "Ann"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 c6 2. d4 1-0'
      );

      expect(game.headers.White).toBe('Ann');
      expect(game.moves.map(({ san }) => san)).toEqual(['e4', 'c6', 'd4']);
      expect(game.moves[1]).toMatchObject({
        ply: 2,
        color: 'black',
        uci: 'c7c6',
        from: 'c7',
        to: 'c6',
        piece: 'p',
        fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      });
    });

    it('should ignore clock comments', () => {
      const game = parsePgn(
        '1. e4 {[%clk 0:09:58.3]} 1... c6 {[%clk 0:09:57.1]} *'
      );

      expect(game.moves.map(({ san }) => san)).toEqual(['e4', 'c6']);
    });

    it('should start from the position given in the FEN header', () => {
      const game = parsePgn(
        '[SetUp "1"]\n[FEN "6k1/5ppp/8/8/8/3B4/5PPP/6K1 w - - 0 1"]\n\n1. Bxh7+ Kxh7 *'
      );

      expect(game.startFen).toBe('6k1/5ppp/8/8/8/3B4/5PPP/6K1 w - - 0 1');
      expect(game.moves[0]).toMatchObject({ san: 'Bxh7+', captured: 'p' });
    });

    it('should throw for text that is not a game', () => {
      expect(() => parsePgn('1. e4 Ke7 2. Zz9')).toThrow();
    });
  });

  describe('createMove', () => {
    const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    it('should describe a legal move the same way a parsed game does', () => {
      const [parsed] = parsePgn('1. e4 *').moves;

      expect(createMove(START, 'e2', 'e4', 1)).toEqual(parsed);
    });

    it('should number the move with the given ply', () => {
      expect(createMove(START, 'g1', 'f3', 21)).toMatchObject({
        ply: 21,
        san: 'Nf3',
        uci: 'g1f3',
        color: 'white',
      });
    });

    it('should promote to a queen', () => {
      expect(
        createMove('8/P6k/8/8/8/8/8/K7 w - - 0 1', 'a7', 'a8', 1)
      ).toMatchObject({ san: 'a8=Q', uci: 'a7a8q', promotion: 'q' });
    });

    it('should return nothing for an illegal move', () => {
      expect(createMove(START, 'e2', 'e5', 1)).toBeUndefined();
    });
  });

  describe('getPositions', () => {
    it('should return one position more than there are moves', () => {
      const positions = getPositions(parsePgn('1. e4 c6 *'));

      expect(positions).toHaveLength(3);
      expect(positions[0]).toBe(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      );
    });
  });

  describe('splitPgn', () => {
    it('should split a file with several games', () => {
      const games = splitPgn(
        '[White "A"]\n[Black "B"]\n\n1. e4 e5 1-0\n\n[White "C"]\n[Black "D"]\n\n1. d4 d5 0-1\n'
      );

      expect(games).toHaveLength(2);
      expect(parsePgn(games[1]).headers.White).toBe('C');
    });

    it('should keep a single game without headers as one game', () => {
      expect(splitPgn('1. e4 c6 2. d4 d5 *')).toEqual(['1. e4 c6 2. d4 d5 *']);
    });

    it('should handle Windows line endings', () => {
      const games = splitPgn(
        '[White "A"]\r\n\r\n1. e4 e5 1-0\r\n\r\n[White "C"]\r\n\r\n1. d4 d5 0-1'
      );

      expect(games).toHaveLength(2);
    });

    it('should return nothing for empty text', () => {
      expect(splitPgn('  \n ')).toEqual([]);
    });
  });
});
