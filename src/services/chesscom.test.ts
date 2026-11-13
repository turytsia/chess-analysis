import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ChesscomErrorCode,
  fetchArchiveMonths,
  fetchMonthlyGames,
  parseChesscomGame,
} from './chesscom';

function stubFetch(response: Partial<Response> | Error): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve(response)
    )
  );
}

describe('chesscom', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchArchiveMonths', () => {
    it('should request the archives of the lowercased username', async () => {
      stubFetch({
        ok: true,
        status: 200,
        json: async () => ({ archives: [] }),
      });

      await fetchArchiveMonths(' TestUser ', new AbortController().signal);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.chess.com/pub/player/testuser/games/archives',
        expect.anything()
      );
    });

    it('should return the months in chronological order', async () => {
      stubFetch({
        ok: true,
        status: 200,
        json: async () => ({
          archives: [
            'https://api.chess.com/pub/player/testuser/games/2026/10',
            'https://api.chess.com/pub/player/testuser/games/2025/12',
          ],
        }),
      });

      expect(
        await fetchArchiveMonths('testuser', new AbortController().signal)
      ).toEqual(['2025/12', '2026/10']);
    });

    it.each([
      { status: 404, code: ChesscomErrorCode.NotFound },
      { status: 429, code: ChesscomErrorCode.RateLimited },
      { status: 500, code: ChesscomErrorCode.Unexpected },
    ])(
      'should fail with $code for a $status response',
      async ({ status, code }) => {
        stubFetch({ ok: false, status });

        await expect(
          fetchArchiveMonths('testuser', new AbortController().signal)
        ).rejects.toMatchObject({ code });
      }
    );

    it('should fail with a network error when the request cannot be made', async () => {
      stubFetch(new TypeError('Failed to fetch'));

      await expect(
        fetchArchiveMonths('testuser', new AbortController().signal)
      ).rejects.toMatchObject({ code: ChesscomErrorCode.Network });
    });

    it('should pass a cancellation through unchanged', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      stubFetch(abortError);

      await expect(
        fetchArchiveMonths('testuser', new AbortController().signal)
      ).rejects.toBe(abortError);
    });
  });

  describe('fetchMonthlyGames', () => {
    it('should return standard games and skip variants', async () => {
      stubFetch({
        ok: true,
        status: 200,
        json: async () => ({
          games: [
            {
              url: 'https://www.chess.com/game/live/1',
              pgn: '1. e4 c6 *',
              rules: 'chess',
              time_class: 'blitz',
              end_time: 1790000000,
            },
            { pgn: '1. e4 c6 *', rules: 'chess960' },
          ],
        }),
      });

      expect(
        await fetchMonthlyGames(
          'testuser',
          '2026/10',
          new AbortController().signal
        )
      ).toEqual([
        {
          url: 'https://www.chess.com/game/live/1',
          pgn: '1. e4 c6 *',
          timeClass: 'blitz',
          endTime: 1790000000,
        },
      ]);
    });
  });

  describe('parseChesscomGame', () => {
    it('should skip entries without a PGN', () => {
      expect(parseChesscomGame({ rules: 'chess' })).toBeUndefined();
    });

    it('should tolerate missing optional fields', () => {
      expect(parseChesscomGame({ pgn: '1. e4 *', rules: 'chess' })).toEqual({
        pgn: '1. e4 *',
        url: undefined,
        timeClass: undefined,
        endTime: undefined,
      });
    });
  });
});
