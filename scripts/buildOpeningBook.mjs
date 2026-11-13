import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const SOURCE_URL =
  'https://raw.githubusercontent.com/lichess-org/chess-openings/master';
const VOLUMES = ['a', 'b', 'c', 'd', 'e'];
const OUTPUT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/data/openingBook.json'
);

await buildOpeningBook();

async function buildOpeningBook() {
  const volumes = await Promise.all(VOLUMES.map(fetchVolume));
  const entries = volumes
    .flat()
    .map(toEntry)
    .sort((a, b) => a[0].localeCompare(b[0]) || a[2].localeCompare(b[2]));

  await writeFile(OUTPUT_PATH, `${JSON.stringify(entries)}\n`);
  console.warn(`Wrote ${entries.length} openings to ${OUTPUT_PATH}`);
}

async function fetchVolume(volume) {
  const response = await fetch(`${SOURCE_URL}/${volume}.tsv`);
  if (!response.ok) {
    throw new Error(`Failed to download ${volume}.tsv: ${response.status}`);
  }
  const [, ...rows] = (await response.text()).trim().split('\n');
  return rows.map((row) => row.split('\t'));
}

function toEntry([eco, name, pgn]) {
  const chess = new Chess();
  const moves = pgn
    .split(/\s+/)
    .filter((token) => !/^\d+\.+$/.test(token))
    .map((token) => chess.move(token).san);

  return [eco, name, moves.join(' '), toEpd(chess.fen())];
}

function toEpd(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}
