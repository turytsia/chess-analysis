import { describe, expect, it } from 'vitest';

import type { StoredGame } from '../../services/db';
import {
  DEFAULT_GAME_FILTERS,
  filterGames,
  getOpeningFamilies,
} from './filterGames';

const NOW = Date.UTC(2026, 10, 13);
const DAY_MS = 24 * 60 * 60 * 1000;

function gameOf(overrides: Partial<StoredGame>): StoredGame {
  return {
    id: 'game',
    source: 'pgn',
    pgn: '',
    sanMoves: [],
    white: { name: 'Rival' },
    black: { name: 'Tester' },
    result: '0-1',
    userColor: 'black',
    outcome: 'win',
    playedAt: NOW - DAY_MS,
    importedAt: NOW,
    timeClass: 'rapid',
    bookPlies: 0,
    ...overrides,
  };
}

function idsOf(games: Array<StoredGame>): Array<string> {
  return games.map(({ id }) => id);
}

describe('filterGames', () => {
  const games = [
    gameOf({
      id: 'caro-win',
      opening: 'Caro-Kann Defense: Advance Variation',
      eco: 'B12',
      accuracy: { white: 80, black: 91 },
    }),
    gameOf({
      id: 'nimzo-loss',
      userColor: 'white',
      outcome: 'loss',
      white: { name: 'Tester' },
      black: { name: 'NimzoNerd' },
      opening: 'Nimzo-Indian Defense',
      eco: 'E20',
      playedAt: NOW - 40 * DAY_MS,
    }),
    gameOf({
      id: 'caro-draw',
      outcome: 'draw',
      opening: 'Caro-Kann Defense',
      eco: 'B10',
      playedAt: NOW - 200 * DAY_MS,
    }),
  ];

  it('should return every game with the default filters', () => {
    expect(idsOf(filterGames(games, DEFAULT_GAME_FILTERS, NOW))).toEqual([
      'caro-win',
      'nimzo-loss',
      'caro-draw',
    ]);
  });

  it('should filter by the color the user played', () => {
    expect(
      idsOf(
        filterGames(games, { ...DEFAULT_GAME_FILTERS, color: 'white' }, NOW)
      )
    ).toEqual(['nimzo-loss']);
  });

  it('should filter by result', () => {
    expect(
      idsOf(
        filterGames(games, { ...DEFAULT_GAME_FILTERS, outcome: 'draw' }, NOW)
      )
    ).toEqual(['caro-draw']);
  });

  it('should filter by opening family, covering all of its variations', () => {
    expect(
      idsOf(
        filterGames(
          games,
          { ...DEFAULT_GAME_FILTERS, opening: 'Caro-Kann Defense' },
          NOW
        )
      )
    ).toEqual(['caro-win', 'caro-draw']);
  });

  it('should filter by how recently the game was played', () => {
    expect(
      idsOf(
        filterGames(games, { ...DEFAULT_GAME_FILTERS, period: 'quarter' }, NOW)
      )
    ).toEqual(['caro-win', 'nimzo-loss']);
  });

  it('should filter by analysis status', () => {
    expect(
      idsOf(
        filterGames(games, { ...DEFAULT_GAME_FILTERS, status: 'analyzed' }, NOW)
      )
    ).toEqual(['caro-win']);
    expect(
      idsOf(
        filterGames(games, { ...DEFAULT_GAME_FILTERS, status: 'pending' }, NOW)
      )
    ).toEqual(['nimzo-loss', 'caro-draw']);
  });

  it('should search players, openings and ECO codes without regard to case', () => {
    expect(
      idsOf(
        filterGames(
          games,
          { ...DEFAULT_GAME_FILTERS, search: 'nimzonerd' },
          NOW
        )
      )
    ).toEqual(['nimzo-loss']);
    expect(
      idsOf(filterGames(games, { ...DEFAULT_GAME_FILTERS, search: 'b12' }, NOW))
    ).toEqual(['caro-win']);
  });

  it('should list opening families by how often they were played', () => {
    expect(getOpeningFamilies(games)).toEqual([
      'Caro-Kann Defense',
      'Nimzo-Indian Defense',
    ]);
  });
});
