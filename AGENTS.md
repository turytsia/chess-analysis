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
| `pnpm lint:unused` | Reports unused files and dependencies, and exports no other file imports |
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
│  ├─ BoardPage.tsx        page frame that fits the window on large screens
│  ├─ BoardLayout.tsx      board and side panel as one aligned group, controls at the panel bottom
│  ├─ EvalBar.tsx          evaluation bar shown next to a board
│  ├─ EngineLines.tsx      engine lines for one position
│  ├─ MoveLine.tsx         clickable line of moves with a cursor
│  ├─ MoveLabelIcon.tsx    icon for a move label (Best, Blunder, ...)
│  ├─ MoveVerdict.tsx      a move with its label, or "judging" while the engine works
│  ├─ StepControls.tsx     first / previous / next / last buttons
│  ├─ RelativeDate.tsx     "Today", "Yesterday", "3 days ago"
│  └─ AppHeader.tsx
├─ features/
│  ├─ library/             game list, filters, chess.com and PGN import
│  ├─ analysis/            board, move list, graph, report, exploring other moves
│  └─ trainer/             Caro-Kann browser, drills, review queue, links to real games
├─ services/               framework-free logic, each with tests next to it
│  ├─ pgn.ts               PGN parsing and splitting
│  ├─ pgnExport.ts         annotated PGN export
│  ├─ chesscom.ts          chess.com API client
│  ├─ gameRecord.ts        PGN to stored game
│  ├─ importer.ts          import orchestration
│  ├─ db.ts                IndexedDB access; the only module that touches the database
│  ├─ engine.ts            Stockfish worker wrapper (UCI, queue, cancel)
│  ├─ analysis.ts          runs the engine over a game or a single position
│  ├─ liveEngine.ts        second engine for positions the user explores
│  ├─ evaluation.ts        win probability and accuracy
│  ├─ material.ts          sacrifice detection and game phases
│  ├─ classify.ts          move labels and the game report
│  ├─ openings.ts          opening tree and matching
│  ├─ deviations.ts        where real games left theory
│  ├─ leitner.ts           spaced repetition
│  └─ notation.ts          move notation helpers
├─ stores/                 Zustand stores: settings and engine speed (persisted), analysis run, import run
├─ translations/           i18n setup, typed keys, one JSON file per namespace
├─ utilities/              router, formatting, theme, shared hooks (`useLiveEvals`)
└─ data/openingBook.json   generated; do not edit by hand
scripts/                   build-time Node scripts
```

## Things worth knowing

- **Engine.** `engine.ts` loads the multi-threaded Stockfish build when the page is cross-origin
  isolated and falls back to the single-threaded one. The dev server sends the isolation headers
  through a small plugin in `vite.config.ts`, because they must also be on "304 Not Modified"
  answers; on GitHub Pages `public/coi-serviceworker.js` adds them.
- **Safari always gets the single-threaded engine,** and so does every browser on iOS. On WebKit
  the multi-threaded build measured about four times slower than one thread and regularly stopped
  answering in the middle of a search. Test engine changes in WebKit as well as Chrome.
- **Analysis cache.** Results are stored per game, depth and number of lines. A cancelled run is
  stored too and resumes where it stopped.
- **Board pages never scroll the page on large screens.** The game screen, the trainer browser
  and a drill session are wrapped in `BoardPage` and laid out with `BoardLayout`: the board takes
  the largest square that fits, the side panel is exactly as tall as the board, and long content
  (move list, continuations, report) scrolls inside its own card. Step buttons go into the
  `controls` slot, which sits at the bottom of the panel; board toggles such as "show best move"
  and "flip" go into the `tools` slot, a narrow strip between the board and the panel. Check a
  short window (about 1366×650) after changing these screens. Below the `lg` breakpoint the same screens stack and
  scroll normally, with the controls directly under the board.
- **Dates are shown relative to today** through `RelativeDate`, with the exact date as a tooltip.
- **Exploring.** On the game screen and in the trainer browser the user can play any legal move.
  Those positions are evaluated live by a second engine (`liveEngine.ts`, `useLiveEvals`), so they
  never wait for a running game analysis, and nothing about them is stored. A live result is
  shown only when its search is finished, never while it is still deepening, so the best-move
  arrow and the verdict do not jump around. While a result is pending, `EvalBar` keeps showing
  the last evaluation it had instead of dropping to the middle (`isPending`). Only the move on
  the board gets a verdict, shown under the line of moves; the line itself carries no labels.
  Verdicts use the same rules as game moves (`assessMoves` in `classify.ts`); in the trainer, a
  move that is in the opening book is labeled Book without the engine. The navigation rules are
  pure functions: `features/analysis/exploration.ts` for the game screen and
  `features/trainer/browseLine.ts` for the trainer. Arrow keys are wired by `useStepKeys`.
- **Engine speed is measured, not guessed.** Every finished search reports how long it took
  (`onSearched` in `analysis.ts`); `engineStatsStore` keeps the average per engine build, depth
  and number of lines, and the engine settings dialog shows it. There is no playing-strength
  number in the app, because nobody has measured one for these builds at these depths. Do not
  add one that is made up.
- **The game's own moves always stay the history.** On the game screen the explored line is a
  side line: the arrows walk it only while the board shows one of its moves, and from a game
  position they follow the game again and drop the side line.
- **A game opens on its first move,** not on the starting position.
- **An engine that cannot start must be visible.** Live evaluation retries once and then shows an
  error instead of an endless "Evaluating…"; a failed game analysis shows a toast.
- **Move labels.** Thresholds live at the top of `classify.ts`. Brilliant and Great are
  heuristics; change them together with the tests in `classify.test.ts`.
- **Opening data.** The book comes from the Lichess `chess-openings` tables. The trainer uses the
  lines with ECO codes B10 to B19.
- **chess.com API.** Requests run one at a time. Finished months are fetched once and remembered.
