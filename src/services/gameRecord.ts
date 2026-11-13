import { isValid, parseISO } from 'date-fns';

import type {
  GameOutcome,
  GameResult,
  GameSource,
  StoredGame,
  TimeClass,
} from './db';
import type { PlayerColor } from './evaluation';
import { matchOpening, type OpeningBook } from './openings';
import { parsePgn } from './pgn';

const CHESSCOM_GAME_URL = /chess\.com\/game\/(live|daily)\/(\d+)/;
const DAILY_TIME_CONTROL = /^\d+\/\d+$/;
const ESTIMATED_GAME_MOVES = 40;
const BULLET_MAX_SECONDS = 180;
const BLITZ_MAX_SECONDS = 600;
const RESULTS: ReadonlyArray<string> = ['1-0', '0-1', '1/2-1/2'];
const TIME_CLASSES: ReadonlyArray<string> = [
  'bullet',
  'blitz',
  'rapid',
  'daily',
];

export interface GameRecordContext {
  username: string;
  source: GameSource;
  fallbackColor: PlayerColor;
  book: OpeningBook;
  importedAt: number;
  url: string | undefined;
  timeClass: string | undefined;
  endTime: number | undefined;
}

export function createGameRecord(
  pgn: string,
  context: GameRecordContext
): StoredGame {
  const game = parsePgn(pgn);
  const { headers, moves } = game;
  const url = context.url ?? headers.Link ?? getUrl(headers.Site);
  const result = toResult(headers.Result);
  const userColor = getUserColor(headers, context);
  const opening = matchOpening(context.book, moves);

  return {
    id: getGameId(url, pgn),
    source: context.source,
    pgn,
    sanMoves: moves.map(({ san }) => san),
    white: { name: headers.White ?? '?', rating: toRating(headers.WhiteElo) },
    black: { name: headers.Black ?? '?', rating: toRating(headers.BlackElo) },
    result,
    userColor,
    outcome: getOutcome(result, userColor),
    playedAt: getPlayedAt(headers, context),
    importedAt: context.importedAt,
    timeControl: headers.TimeControl,
    timeClass: getTimeClass(context.timeClass, headers.TimeControl),
    url,
    eco: opening.opening?.eco ?? headers.ECO,
    opening: opening.opening?.name ?? headers.Opening,
    bookPlies: opening.bookPlies,
  };
}

function getGameId(url: string | undefined, pgn: string): string {
  const chesscomGame = url && CHESSCOM_GAME_URL.exec(url);
  return chesscomGame
    ? `chesscom:${chesscomGame[1]}:${chesscomGame[2]}`
    : `pgn:${hashText(pgn.replace(/\s+/g, ' ').trim())}`;
}

function getUrl(site: string | undefined): string | undefined {
  return site?.startsWith('http') ? site : undefined;
}

function getUserColor(
  headers: Record<string, string>,
  { username, fallbackColor }: GameRecordContext
): PlayerColor {
  const normalized = username.trim().toLowerCase();
  if (normalized.length === 0) {
    return fallbackColor;
  }
  if (headers.White?.toLowerCase() === normalized) {
    return 'white';
  }
  return headers.Black?.toLowerCase() === normalized ? 'black' : fallbackColor;
}

function toResult(result: string | undefined): GameResult {
  return result !== undefined && isGameResult(result) ? result : '*';
}

function isGameResult(result: string): result is GameResult {
  return RESULTS.includes(result);
}

function getOutcome(result: GameResult, userColor: PlayerColor): GameOutcome {
  if (result === '*') {
    return 'unknown';
  }
  if (result === '1/2-1/2') {
    return 'draw';
  }
  return (result === '1-0') === (userColor === 'white') ? 'win' : 'loss';
}

function getPlayedAt(
  headers: Record<string, string>,
  { endTime, importedAt }: GameRecordContext
): number {
  if (endTime !== undefined) {
    return endTime * 1000;
  }
  const date = (headers.UTCDate ?? headers.Date)?.replace(/\./g, '-');
  const played = parseISO(`${date}T${headers.UTCTime ?? '00:00:00'}Z`);
  return isValid(played) ? played.getTime() : importedAt;
}

function getTimeClass(
  timeClass: string | undefined,
  timeControl: string | undefined
): TimeClass {
  if (timeClass !== undefined && isTimeClass(timeClass)) {
    return timeClass;
  }
  if (timeControl === undefined) {
    return 'unknown';
  }
  if (DAILY_TIME_CONTROL.test(timeControl)) {
    return 'daily';
  }
  const [base, increment = 0] = timeControl.split('+').map(Number);
  if (!Number.isFinite(base) || !Number.isFinite(increment)) {
    return 'unknown';
  }
  const estimatedSeconds = base + increment * ESTIMATED_GAME_MOVES;
  if (estimatedSeconds < BULLET_MAX_SECONDS) {
    return 'bullet';
  }
  return estimatedSeconds < BLITZ_MAX_SECONDS ? 'blitz' : 'rapid';
}

function isTimeClass(value: string): value is TimeClass {
  return TIME_CLASSES.includes(value);
}

function toRating(elo: string | undefined): number | undefined {
  const rating = Number(elo);
  return elo !== undefined && Number.isFinite(rating) && rating > 0
    ? rating
    : undefined;
}

function hashText(text: string): string {
  let high = 0xdeadbeef;
  let low = 0x41c6ce57;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    high = Math.imul(high ^ code, 2654435761);
    low = Math.imul(low ^ code, 1597334677);
  }
  high =
    Math.imul(high ^ (high >>> 16), 2246822507) ^
    Math.imul(low ^ (low >>> 13), 3266489909);
  low =
    Math.imul(low ^ (low >>> 16), 2246822507) ^
    Math.imul(high ^ (high >>> 13), 3266489909);
  return (4294967296 * (2097151 & low) + (high >>> 0)).toString(36);
}
