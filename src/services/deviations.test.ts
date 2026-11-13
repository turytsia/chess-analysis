import { describe, expect, it } from 'vitest';

import type { StoredGame } from './db';
import { findTheoryDeviation, groupDeviations } from './deviations';
import { createOpeningBook } from './openings';

const { root: ROOT } = createOpeningBook([
  {
    id: 'e4 c6',
    eco: 'B10',
    name: 'Caro-Kann Defense',
    moves: ['e4', 'c6'],
    epd: 'caro-kann',
  },
  {
    id: 'e4 c6 d4 d5 e5',
    eco: 'B12',
    name: 'Caro-Kann Defense: Advance Variation',
    moves: ['e4', 'c6', 'd4', 'd5', 'e5'],
    epd: 'advance',
  },
  {
    id: 'e4 c6 d4 d5 e5 Bf5 Nf3',
    eco: 'B12',
    name: 'Caro-Kann Defense: Advance Variation, Short Variation',
    moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3'],
    epd: 'short',
  },
]);
const ENTRY_PLIES = 2;

function gameOf(overrides: Partial<StoredGame>): StoredGame {
  return {
    id: 'game',
    source: 'pgn',
    pgn: '',
    sanMoves: [],
    white: { name: 'Rival' },
    black: { name: 'Tester' },
    result: '*',
    userColor: 'black',
    outcome: 'unknown',
    playedAt: 0,
    importedAt: 0,
    timeClass: 'rapid',
    bookPlies: 0,
    ...overrides,
  };
}

describe('deviations', () => {
  describe('findTheoryDeviation', () => {
    it('should report where the user left the book and what the book offers', () => {
      const deviation = findTheoryDeviation(
        ROOT,
        gameOf({ sanMoves: ['e4', 'c6', 'd4', 'd5', 'e5', 'e6', 'Nf3'] }),
        ENTRY_PLIES
      );

      expect(deviation).toMatchObject({
        side: 'user',
        ply: 6,
        playedSan: 'e6',
        path: ['e4', 'c6', 'd4', 'd5', 'e5'],
        opening: { name: 'Caro-Kann Defense: Advance Variation' },
        bookMoves: [
          {
            san: 'Bf5',
            name: 'Caro-Kann Defense: Advance Variation, Short Variation',
          },
        ],
      });
    });

    it('should attribute the deviation to the opponent when they moved', () => {
      const deviation = findTheoryDeviation(
        ROOT,
        gameOf({ sanMoves: ['e4', 'c6', 'd4', 'd5', 'Nc3'] }),
        ENTRY_PLIES
      );

      expect(deviation).toMatchObject({
        side: 'opponent',
        ply: 5,
        playedSan: 'Nc3',
      });
    });

    it('should ignore games that never entered the opening', () => {
      expect(
        findTheoryDeviation(
          ROOT,
          gameOf({ sanMoves: ['e4', 'e5', 'Nf3'] }),
          ENTRY_PLIES
        )
      ).toBeUndefined();
    });

    it('should ignore games that simply outlasted the known line', () => {
      expect(
        findTheoryDeviation(
          ROOT,
          gameOf({
            sanMoves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6'],
          }),
          ENTRY_PLIES
        )
      ).toBeUndefined();
    });

    it('should ignore games that ended while still in the book', () => {
      expect(
        findTheoryDeviation(
          ROOT,
          gameOf({ sanMoves: ['e4', 'c6', 'd4'] }),
          ENTRY_PLIES
        )
      ).toBeUndefined();
    });
  });

  describe('groupDeviations', () => {
    it('should group identical deviations and put the most frequent first', () => {
      const deviate = (id: string, sixthMove: string): StoredGame =>
        gameOf({ id, sanMoves: ['e4', 'c6', 'd4', 'd5', 'e5', sixthMove] });
      const deviations = [
        deviate('a', 'c5'),
        deviate('b', 'e6'),
        deviate('c', 'e6'),
      ].flatMap((game) => findTheoryDeviation(ROOT, game, ENTRY_PLIES) ?? []);

      const groups = groupDeviations(deviations);

      expect(
        groups.map(({ playedSan, games }) => [
          playedSan,
          games.map(({ id }) => id),
        ])
      ).toEqual([
        ['e6', ['b', 'c']],
        ['c5', ['a']],
      ]);
    });
  });
});
