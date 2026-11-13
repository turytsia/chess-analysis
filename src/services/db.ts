import { Dexie, type EntityTable, type Table } from 'dexie';

import type { PlayerColor, PositionEval, SideValues } from './evaluation';
import type { LineProgress } from './leitner';

const DATABASE_NAME = 'chessAnalysis';
const DATABASE = createDatabase();

export type GameSource = 'chesscom' | 'pgn';

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';

export type GameOutcome = 'win' | 'loss' | 'draw' | 'unknown';

export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'daily' | 'unknown';

export interface PlayerInfo {
  name: string;
  rating?: number;
}

export interface StoredGame {
  id: string;
  source: GameSource;
  pgn: string;
  sanMoves: Array<string>;
  white: PlayerInfo;
  black: PlayerInfo;
  result: GameResult;
  userColor: PlayerColor;
  outcome: GameOutcome;
  playedAt: number;
  importedAt: number;
  timeControl?: string;
  timeClass: TimeClass;
  url?: string;
  eco?: string;
  opening?: string;
  bookPlies: number;
  accuracy?: SideValues<number>;
}

export interface StoredAnalysis {
  gameId: string;
  depth: number;
  multiPv: number;
  positions: Array<PositionEval>;
  isComplete: boolean;
  updatedAt: number;
}

interface StoredNote {
  gameId: string;
  text: string;
  updatedAt: number;
}

interface StoredArchive {
  id: string;
  fetchedAt: number;
}

export function listGames(): Promise<Array<StoredGame>> {
  return gamesTable().orderBy('playedAt').reverse().toArray();
}

export function getGame(id: string): Promise<StoredGame | undefined> {
  return gamesTable().get(id);
}

export async function addGames(games: Array<StoredGame>): Promise<number> {
  const existing = await gamesTable().bulkGet(games.map(({ id }) => id));
  const fresh = games.filter(
    (game, index) =>
      existing[index] === undefined &&
      games.findIndex(({ id }) => id === game.id) === index
  );
  await gamesTable().bulkAdd(fresh);
  return fresh.length;
}

export async function setGameAccuracy(
  id: string,
  accuracy: SideValues<number>
): Promise<void> {
  await gamesTable().update(id, { accuracy });
}

export async function deleteGame(id: string): Promise<void> {
  await DATABASE.transaction(
    'rw',
    [gamesTable(), analysesTable(), notesTable()],
    async () => {
      await gamesTable().delete(id);
      await analysesTable().where('gameId').equals(id).delete();
      await notesTable().delete(id);
    }
  );
}

export function listAnalyses(gameId: string): Promise<Array<StoredAnalysis>> {
  return analysesTable().where('gameId').equals(gameId).toArray();
}

export async function saveAnalysis(analysis: StoredAnalysis): Promise<void> {
  await analysesTable().put(analysis);
}

export async function getNoteText(gameId: string): Promise<string> {
  return (await notesTable().get(gameId))?.text ?? '';
}

export async function saveNote(gameId: string, text: string): Promise<void> {
  await notesTable().put({ gameId, text, updatedAt: Date.now() });
}

export async function listFetchedArchives(): Promise<Set<string>> {
  return new Set(await archivesTable().toCollection().primaryKeys());
}

export async function markArchiveFetched(id: string): Promise<void> {
  await archivesTable().put({ id, fetchedAt: Date.now() });
}

export function listLineProgress(): Promise<Array<LineProgress>> {
  return lineProgressTable().toArray();
}

export async function saveLineProgress(progress: LineProgress): Promise<void> {
  await lineProgressTable().put(progress);
}

function createDatabase(): Dexie {
  const instance = new Dexie(DATABASE_NAME);
  instance.version(1).stores({
    games: 'id, playedAt',
    analyses: '[gameId+depth+multiPv], gameId',
    notes: 'gameId',
    archives: 'id',
    lineProgress: 'lineId',
  });
  return instance;
}

function gamesTable(): EntityTable<StoredGame, 'id'> {
  return DATABASE.table('games');
}

function analysesTable(): Table<StoredAnalysis, [string, number, number]> {
  return DATABASE.table('analyses');
}

function notesTable(): EntityTable<StoredNote, 'gameId'> {
  return DATABASE.table('notes');
}

function archivesTable(): EntityTable<StoredArchive, 'id'> {
  return DATABASE.table('archives');
}

function lineProgressTable(): EntityTable<LineProgress, 'lineId'> {
  return DATABASE.table('lineProgress');
}
