import { describe, expect, it } from 'vitest';

import { createGameRecord, type GameRecordContext } from './gameRecord';
import { createOpeningBook } from './openings';

const BOOK = createOpeningBook([
  {
    id: 'e4 c6',
    eco: 'B10',
    name: 'Caro-Kann Defense',
    moves: ['e4', 'c6'],
    epd: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -',
  },
]);
const CHESSCOM_PGN = [
  '[Event "Live Chess"]',
  '[Site "Chess.com"]',
  '[Date "2026.10.02"]',
  '[White "Rival"]',
  '[Black "Tester"]',
  '[Result "0-1"]',
  '[UTCDate "2026.10.02"]',
  '[UTCTime "18:22:10"]',
  '[WhiteElo "1480"]',
  '[BlackElo "1512"]',
  '[TimeControl "600"]',
  '[Link "https://www.chess.com/game/live/111000111"]',
  '',
  '1. e4 c6 2. d4 d5 0-1',
].join('\n');

function contextOf(overrides: Partial<GameRecordContext>): GameRecordContext {
  return {
    username: 'tester',
    source: 'pgn',
    fallbackColor: 'white',
    book: BOOK,
    importedAt: 1_800_000_000_000,
    url: undefined,
    timeClass: undefined,
    endTime: undefined,
    ...overrides,
  };
}

describe('createGameRecord', () => {
  it('should identify a chess.com game by its link so both import paths match', () => {
    expect(createGameRecord(CHESSCOM_PGN, contextOf({})).id).toBe(
      'chesscom:live:111000111'
    );
  });

  it('should give the same id to the same PGN without a link', () => {
    const first = createGameRecord('1. e4 c6 *', contextOf({}));
    const second = createGameRecord('1.  e4   c6 *\n', contextOf({}));

    expect(first.id).toMatch(/^pgn:/);
    expect(second.id).toBe(first.id);
  });

  it('should find the user by name regardless of letter case', () => {
    const game = createGameRecord(CHESSCOM_PGN, contextOf({}));

    expect(game.userColor).toBe('black');
    expect(game.outcome).toBe('win');
  });

  it('should fall back to the chosen color when no player matches', () => {
    const game = createGameRecord(
      CHESSCOM_PGN,
      contextOf({ username: 'someone', fallbackColor: 'white' })
    );

    expect(game.userColor).toBe('white');
    expect(game.outcome).toBe('loss');
  });

  it('should read players, ratings, moves and the opening', () => {
    expect(createGameRecord(CHESSCOM_PGN, contextOf({}))).toMatchObject({
      white: { name: 'Rival', rating: 1480 },
      black: { name: 'Tester', rating: 1512 },
      result: '0-1',
      sanMoves: ['e4', 'c6', 'd4', 'd5'],
      eco: 'B10',
      opening: 'Caro-Kann Defense',
      bookPlies: 2,
      url: 'https://www.chess.com/game/live/111000111',
    });
  });

  it('should take the date from the UTC headers', () => {
    expect(createGameRecord(CHESSCOM_PGN, contextOf({})).playedAt).toBe(
      Date.UTC(2026, 9, 2, 18, 22, 10)
    );
  });

  it('should prefer the end time reported by chess.com', () => {
    const game = createGameRecord(
      CHESSCOM_PGN,
      contextOf({ endTime: 1_790_000_000 })
    );

    expect(game.playedAt).toBe(1_790_000_000_000);
  });

  it('should use the import time when the game has no usable date', () => {
    const game = createGameRecord(
      '[Date "????.??.??"]\n\n1. e4 c6 *',
      contextOf({})
    );

    expect(game.playedAt).toBe(1_800_000_000_000);
  });

  it.each([
    { timeControl: '60', timeClass: 'bullet' },
    { timeControl: '180+2', timeClass: 'blitz' },
    { timeControl: '600', timeClass: 'rapid' },
    { timeControl: '1/86400', timeClass: 'daily' },
    { timeControl: '-', timeClass: 'unknown' },
  ])(
    'should derive $timeClass from time control $timeControl',
    ({ timeControl, timeClass }) => {
      const game = createGameRecord(
        `[TimeControl "${timeControl}"]\n\n1. e4 c6 *`,
        contextOf({})
      );

      expect(game.timeClass).toBe(timeClass);
    }
  );

  it('should mark an unfinished game as having an unknown outcome', () => {
    const game = createGameRecord('1. e4 c6 *', contextOf({}));

    expect(game.result).toBe('*');
    expect(game.outcome).toBe('unknown');
  });

  it('should throw for an unreadable PGN', () => {
    expect(() => createGameRecord('1. e4 Zz9', contextOf({}))).toThrow();
  });
});
