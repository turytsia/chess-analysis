const API_BASE_URL = 'https://api.chess.com/pub/player';
const STANDARD_RULES = 'chess';
const ARCHIVE_MONTH_PATTERN = /\/(\d{4}\/\d{2})$/;

export enum ChesscomErrorCode {
  NotFound = 'notFound',
  RateLimited = 'rateLimited',
  Network = 'network',
  Unexpected = 'unexpected',
}

export class ChesscomError extends Error {
  constructor(readonly code: ChesscomErrorCode) {
    super(`chess.com request failed: ${code}`);
    this.name = 'ChesscomError';
  }
}

export interface ChesscomGame {
  pgn: string;
  url: string | undefined;
  timeClass: string | undefined;
  endTime: number | undefined;
}

export async function fetchArchiveMonths(
  username: string,
  signal: AbortSignal
): Promise<Array<string>> {
  const body = await requestJson(
    `${getPlayerUrl(username)}/games/archives`,
    signal
  );
  const archives =
    isRecord(body) && Array.isArray(body.archives) ? body.archives : [];
  return archives
    .flatMap((url) => {
      const month = typeof url === 'string' && ARCHIVE_MONTH_PATTERN.exec(url);
      return month ? [month[1]] : [];
    })
    .sort();
}

export async function fetchMonthlyGames(
  username: string,
  month: string,
  signal: AbortSignal
): Promise<Array<ChesscomGame>> {
  const body = await requestJson(
    `${getPlayerUrl(username)}/games/${month}`,
    signal
  );
  const games = isRecord(body) && Array.isArray(body.games) ? body.games : [];
  return games.flatMap((game) => parseChesscomGame(game) ?? []);
}

export function parseChesscomGame(game: unknown): ChesscomGame | undefined {
  if (
    !isRecord(game) ||
    typeof game.pgn !== 'string' ||
    game.rules !== STANDARD_RULES
  ) {
    return undefined;
  }
  return {
    pgn: game.pgn,
    url: typeof game.url === 'string' ? game.url : undefined,
    timeClass:
      typeof game.time_class === 'string' ? game.time_class : undefined,
    endTime: typeof game.end_time === 'number' ? game.end_time : undefined,
  };
}

async function requestJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal }).catch((error: unknown) => {
    throw isAbortError(error)
      ? error
      : new ChesscomError(ChesscomErrorCode.Network);
  });

  if (response.status === 404) {
    throw new ChesscomError(ChesscomErrorCode.NotFound);
  }
  if (response.status === 429) {
    throw new ChesscomError(ChesscomErrorCode.RateLimited);
  }
  if (!response.ok) {
    throw new ChesscomError(ChesscomErrorCode.Unexpected);
  }
  return response.json().catch(() => {
    throw new ChesscomError(ChesscomErrorCode.Unexpected);
  });
}

function getPlayerUrl(username: string): string {
  return `${API_BASE_URL}/${encodeURIComponent(username.trim().toLowerCase())}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
