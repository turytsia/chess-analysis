import { describe, expect, it } from 'vitest';

import {
  countLines,
  createOpeningBook,
  followSequence,
  getNodeName,
  loadCaroKannBook,
  loadOpeningBook,
  matchOpening,
  toEpd,
  type Opening,
} from './openings';
import { parsePgn } from './pgn';

const CARO_KANN: Opening = {
  id: 'e4 c6',
  eco: 'B10',
  name: 'Caro-Kann Defense',
  moves: ['e4', 'c6'],
  epd: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -',
};
const SHORT_VARIATION: Opening = {
  id: 'e4 c6 d4 d5 e5 Bf5 Nf3',
  eco: 'B12',
  name: 'Caro-Kann Defense: Advance Variation, Short Variation',
  moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3'],
  epd: 'rn1qkbnr/pp2pppp/2p5/3pPb2/3P4/5N2/PPP2PPP/RNBQKB1R b KQkq -',
};
const TAL_VARIATION: Opening = {
  id: 'e4 c6 d4 d5 e5 Bf5 h4',
  eco: 'B12',
  name: 'Caro-Kann Defense: Advance Variation, Tal Variation',
  moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4'],
  epd: 'rn1qkbnr/pp2pppp/2p5/3pPb2/3P3P/8/PPP2PP1/RNBQKBNR b KQkq -',
};

describe('openings', () => {
  describe('matchOpening', () => {
    const book = createOpeningBook([CARO_KANN, SHORT_VARIATION, TAL_VARIATION]);

    it('should name the deepest known opening and count the book moves', () => {
      const { moves } = parsePgn('1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 *');

      expect(matchOpening(book, moves)).toEqual({
        opening: SHORT_VARIATION,
        bookPlies: 7,
      });
    });

    it('should keep counting book moves between two named positions', () => {
      const { moves } = parsePgn('1. e4 c6 2. d4 d5 3. Nc3 *');

      expect(matchOpening(book, moves)).toEqual({
        opening: CARO_KANN,
        bookPlies: 4,
      });
    });

    it('should recognize a named position reached by another move order', () => {
      const { moves } = parsePgn('1. d4 c6 2. e4 d5 3. e5 Bf5 4. Nf3 e6 *');

      expect(matchOpening(book, moves)).toEqual({
        opening: SHORT_VARIATION,
        bookPlies: 7,
      });
    });

    it('should report no opening for an unknown start', () => {
      const { moves } = parsePgn('1. a3 a6 *');

      expect(matchOpening(book, moves)).toEqual({
        opening: undefined,
        bookPlies: 0,
      });
    });
  });

  describe('followSequence', () => {
    it('should stop at the first move outside the tree', () => {
      const { root } = createOpeningBook([CARO_KANN, SHORT_VARIATION]);

      expect(
        followSequence(root, ['e4', 'c6', 'd4', 'e6']).map(({ san }) => san)
      ).toEqual(['e4', 'c6', 'd4']);
    });
  });

  describe('getNodeName', () => {
    const { root } = createOpeningBook([
      CARO_KANN,
      SHORT_VARIATION,
      TAL_VARIATION,
    ]);

    it('should use the own name of a named position', () => {
      const [, caroKann] = followSequence(root, ['e4', 'c6']);

      expect(getNodeName(caroKann)).toBe('Caro-Kann Defense');
    });

    it('should describe an unnamed position by what its lines share', () => {
      const path = followSequence(root, ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5']);

      expect(getNodeName(path[5])).toBe('Caro-Kann Defense: Advance Variation');
    });
  });

  describe('countLines', () => {
    it('should count every named line at or below a position', () => {
      const { root } = createOpeningBook([
        CARO_KANN,
        SHORT_VARIATION,
        TAL_VARIATION,
      ]);

      expect(countLines(root)).toBe(3);
    });
  });

  describe('toEpd', () => {
    it('should drop the move counters from a FEN', () => {
      expect(
        toEpd('rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2')
      ).toBe('rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -');
    });
  });

  describe('bundled opening book', () => {
    it('should name a real game by its Lichess opening', async () => {
      const book = await loadOpeningBook();
      const { moves } = parsePgn('1. e4 c6 2. d4 d5 3. exd5 cxd5 4. c4 *');

      expect(matchOpening(book, moves).opening).toMatchObject({
        eco: 'B13',
        name: 'Caro-Kann Defense: Panov Attack',
      });
    });

    it('should limit the trainer book to Caro-Kann lines', async () => {
      const book = await loadCaroKannBook();

      expect(book.openings.length).toBeGreaterThan(100);
      expect(
        book.openings.every(
          ({ moves }) => moves[0] === 'e4' && moves[1] === 'c6'
        )
      ).toBe(true);
    });
  });
});
