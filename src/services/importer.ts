import { format } from 'date-fns';

import {
  fetchArchiveMonths,
  fetchMonthlyGames,
  type ChesscomGame,
} from './chesscom';
import {
  addGames,
  listFetchedArchives,
  markArchiveFetched,
  type GameSource,
  type StoredGame,
} from './db';
import type { PlayerColor } from './evaluation';
import { createGameRecord } from './gameRecord';
import { loadOpeningBook, type OpeningBook } from './openings';
import { splitPgn } from './pgn';

const PARSE_BATCH_SIZE = 20;
const ARCHIVE_MONTH_FORMAT = 'yyyy/MM';

export interface ImportProgress {
  completed: number;
  total: number;
  imported: number;
}

export interface ImportSummary {
  imported: number;
  duplicates: number;
  failed: number;
}

interface ChesscomImportParams {
  username: string;
  monthLimit: number | undefined;
  signal: AbortSignal;
  onProgress: (progress: ImportProgress) => void;
}

interface PgnImportParams {
  text: string;
  username: string;
  fallbackColor: PlayerColor;
}

interface ImportSource {
  pgn: string;
  url: string | undefined;
  timeClass: string | undefined;
  endTime: number | undefined;
}

interface ConversionContext {
  username: string;
  source: GameSource;
  fallbackColor: PlayerColor;
  book: OpeningBook;
}

/*
 * Finished months never change on chess.com, so each one is fetched only once
 * and remembered; the current month is always fetched again. Requests run one
 * after another because the API rate-limits parallel access.
 */
export async function importFromChesscom({
  username,
  monthLimit,
  signal,
  onProgress,
}: ChesscomImportParams): Promise<ImportSummary> {
  const [book, allMonths, fetched] = await Promise.all([
    loadOpeningBook(),
    fetchArchiveMonths(username, signal),
    listFetchedArchives(),
  ]);
  const currentMonth = format(new Date(), ARCHIVE_MONTH_FORMAT);
  const normalizedUsername = username.trim().toLowerCase();
  const months = (
    monthLimit === undefined ? allMonths : allMonths.slice(-monthLimit)
  ).filter((month) => !fetched.has(getArchiveId(normalizedUsername, month)));

  let summary: ImportSummary = { imported: 0, duplicates: 0, failed: 0 };
  onProgress({ completed: 0, total: months.length, imported: 0 });

  for (const [index, month] of months.entries()) {
    const games = await fetchMonthlyGames(username, month, signal);
    const monthly = await storeGames(games.map(toImportSource), {
      username,
      source: 'chesscom',
      fallbackColor: 'white',
      book,
    });
    if (month < currentMonth) {
      await markArchiveFetched(getArchiveId(normalizedUsername, month));
    }

    summary = mergeSummaries(summary, monthly);
    onProgress({
      completed: index + 1,
      total: months.length,
      imported: summary.imported,
    });
  }
  return summary;
}

export async function importFromPgn({
  text,
  username,
  fallbackColor,
}: PgnImportParams): Promise<ImportSummary> {
  const book = await loadOpeningBook();
  const sources = splitPgn(text).map(
    (pgn): ImportSource => ({
      pgn,
      url: undefined,
      timeClass: undefined,
      endTime: undefined,
    })
  );
  return storeGames(sources, { username, source: 'pgn', fallbackColor, book });
}

async function storeGames(
  sources: Array<ImportSource>,
  context: ConversionContext
): Promise<ImportSummary> {
  const importedAt = Date.now();
  let records: Array<StoredGame> = [];
  let failed = 0;

  for (let start = 0; start < sources.length; start += PARSE_BATCH_SIZE) {
    const batch = sources
      .slice(start, start + PARSE_BATCH_SIZE)
      .map((source) => toGameRecord(source, context, importedAt));
    records = [...records, ...batch.flatMap((record) => record ?? [])];
    failed += batch.filter((record) => record === undefined).length;
    await yieldToBrowser();
  }

  const imported = await addGames(records);
  return { imported, duplicates: records.length - imported, failed };
}

function toGameRecord(
  { pgn, url, timeClass, endTime }: ImportSource,
  context: ConversionContext,
  importedAt: number
): StoredGame | undefined {
  try {
    return createGameRecord(pgn, {
      ...context,
      importedAt,
      url,
      timeClass,
      endTime,
    });
  } catch {
    return undefined;
  }
}

function toImportSource({
  pgn,
  url,
  timeClass,
  endTime,
}: ChesscomGame): ImportSource {
  return { pgn, url, timeClass, endTime };
}

function mergeSummaries(a: ImportSummary, b: ImportSummary): ImportSummary {
  return {
    imported: a.imported + b.imported,
    duplicates: a.duplicates + b.duplicates,
    failed: a.failed + b.failed,
  };
}

function getArchiveId(username: string, month: string): string {
  return `${username}/${month}`;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
