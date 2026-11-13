# Agent guide

A static React app for analyzing chess games with Stockfish in the browser and training openings.
There is no backend. It is deployed to GitHub Pages.

Read [`docs/coding-practices.md`](docs/coding-practices.md) before writing code. It is the full set
of rules; this file is the short version plus the map of the project.

## Rules that are easy to break

1. **File order.** Every file is laid out as: imports, constants, types, main functions, helpers.
2. **No unused exports.** Export a declaration only when another module imports it.
3. **No comments**, unless they explain complicated functionality that the code cannot express.
4. **All user-facing text goes through `t()`** with a hard-coded PascalCase key, including
   `aria-label` and `placeholder`. A missing key fails the type check.
5. **`Array<T>`, not `T[]`.** Named exports only. SCREAMING_SNAKE_CASE for module-level constants.
   `as const` on constant objects. Proper camelCase (`parsePgn`, not `parsePGN`).
6. **Services stay framework-free.** Nothing in `src/services` imports React or translations.
7. **UI comes from `src/components/ui`** and Tailwind classes, in the Vercel/v0 visual style. No
   separate CSS files and no one-off presentational components inside features.
8. **GitHub Pages constraints.** Relative asset URLs, hash routing, no cross-origin embeds.
9. **Minimize `useEffect`, `useMemo` and `useCallback`.** Derive during render; handle events in
   handlers.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Installs packages and copies the engine files into `public/` |
| `pnpm start` | Dev server on http://localhost:3002 |
| `pnpm compile` | Type check |
| `pnpm lint` | ESLint with autofix, zero warnings allowed |
| `pnpm lint:unused` | Reports unused exports, files and dependencies |
| `pnpm format` | Prettier |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm build` | Type check and production build into `dist/` |
| `pnpm preview` | Serves `dist/` the way GitHub Pages does, without isolation headers |
| `pnpm openings:build` | Regenerates `src/data/openingBook.json` from the Lichess opening tables |

Before you finish, run `pnpm format`, `pnpm lint`, `pnpm lint:unused`, `pnpm test` and
`pnpm build`. All of them must pass. CI runs the same checks before deploying.

## Project map

```
src/
├─ index.tsx, App.tsx      entry point, routing between the three screens
├─ index.css               Tailwind setup and every theme token (the only stylesheet)
├─ components/
│  ├─ ui/                  shared primitives: Button, Dialog, Select, Tabs, Table, ...
│  ├─ Board.tsx            chessboard wrapper used by every screen
│  └─ AppHeader.tsx
├─ features/
│  ├─ library/             game list, filters, chess.com and PGN import
│  ├─ analysis/            board, eval bar, move list, graph, report, notes
│  └─ trainer/             Caro-Kann browser, drills, review queue, links to real games
├─ services/               framework-free logic, each with tests next to it
│  ├─ pgn.ts               PGN parsing and splitting
│  ├─ pgnExport.ts         annotated PGN export
│  ├─ chesscom.ts          chess.com API client
│  ├─ gameRecord.ts        PGN to stored game
│  ├─ importer.ts          import orchestration
│  ├─ db.ts                IndexedDB access; the only module that touches the database
│  ├─ engine.ts            Stockfish worker wrapper (UCI, queue, cancel)
│  ├─ analysis.ts          runs the engine over a game
│  ├─ evaluation.ts        win probability and accuracy
│  ├─ material.ts          sacrifice detection and game phases
│  ├─ classify.ts          move labels and the game report
│  ├─ openings.ts          opening tree and matching
│  ├─ deviations.ts        where real games left theory
│  ├─ leitner.ts           spaced repetition
│  └─ notation.ts          move notation helpers
├─ stores/                 Zustand stores: settings (persisted), analysis run, import run
├─ translations/           i18n setup, typed keys, one JSON file per namespace
├─ utilities/              router, formatting, theme, shared hooks
└─ data/openingBook.json   generated; do not edit by hand
scripts/                   build-time Node scripts
```

## Things worth knowing

- **Engine.** `engine.ts` loads the multi-threaded Stockfish build when the page is cross-origin
  isolated and falls back to the single-threaded one. The dev server sends the isolation headers;
  on GitHub Pages `public/coi-serviceworker.js` adds them.
- **Analysis cache.** Results are stored per game, depth and number of lines. A cancelled run is
  stored too and resumes where it stopped.
- **Move labels.** Thresholds live at the top of `classify.ts`. Brilliant and Great are
  heuristics; change them together with the tests in `classify.test.ts`.
- **Opening data.** The book comes from the Lichess `chess-openings` tables. The trainer uses the
  lines with ECO codes B10 to B19.
- **chess.com API.** Requests run one at a time. Finished months are fetched once and remembered.
