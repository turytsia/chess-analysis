# Chess Analysis

Analyze your chess games with Stockfish in the browser and train your openings. Everything runs on
your device: there is no backend and no account.

## Features

- **Game library.** Import games by chess.com username, or paste or upload PGN. Filter by color,
  result, opening, date and analysis status.
- **Engine analysis.** Multi-threaded Stockfish (WebAssembly) analyzes every position of a game,
  with a progress bar and cancel. Depth, threads, hash size and number of lines are configurable.
  Results are cached, so a game is never analyzed twice with the same settings.
- **Move labels.** Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Miss and
  Blunder, plus accuracy per side and per game phase.
- **Analysis view.** Board with keyboard navigation, eval bar, best-move arrow, move list, a
  clickable graph of winning chances, a list of critical moments and notes per game.
- **Export.** Download any game as a PGN annotated with move labels, evaluations and your notes.
- **Opening trainer.** Browse the Caro-Kann tree with names and ECO codes, drill lines as Black
  with spaced repetition, and see where your own games left theory.

## Getting started

Requires Node.js 22 or newer and pnpm 10.

```bash
pnpm install
pnpm start
```

The app opens at http://localhost:3002. Enter your chess.com username to load your games; the
username is remembered in the browser.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm start` | Dev server |
| `pnpm build` | Type check and production build into `dist/` |
| `pnpm preview` | Serves the production build the way GitHub Pages does |
| `pnpm test` | Unit tests |
| `pnpm lint` | ESLint with autofix |
| `pnpm lint:unused` | Unused exports, files and dependencies |
| `pnpm format` | Prettier |
| `pnpm openings:build` | Regenerates the opening book from the Lichess tables |

If `pnpm openings:build` fails with a certificate error behind a corporate proxy, run
`node --use-system-ca scripts/buildOpeningBook.mjs` instead.

## Deploying to GitHub Pages

1. Push the repository to GitHub with `main` as the default branch.
2. In the repository settings, open **Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` checks, builds and publishes the
   site.

The build uses relative URLs and hash routing, so it works from any sub-folder without
configuration.

### Why there is a service worker

Multi-threaded Stockfish needs `SharedArrayBuffer`, which browsers only enable on pages that are
cross-origin isolated. That normally takes two response headers, and GitHub Pages cannot set
headers. `coi-serviceworker.js` adds them from a service worker instead. On the first visit the
page reloads once while the worker takes control. If the browser blocks service workers, the app
falls back to single-threaded Stockfish and keeps working.

## Where your data lives

- Games, analyses, notes and trainer progress are stored in IndexedDB.
- Settings and your chess.com username are stored in `localStorage`.

Nothing leaves the browser except the requests to the public chess.com API. Clearing the site data
removes everything.

## Notes on accuracy

- Move labels are derived from the change in winning chances. Brilliant and Great are heuristics
  and will not always match chess.com.
- Deeper analysis is more reliable and slower. Depth 16 is a good default; raise it for games you
  want to study closely.

## Credits and licenses

- [Stockfish.js](https://github.com/nmrugg/stockfish.js) provides the engine. The engine files are
  licensed under GPL v3 and are served unmodified next to the app.
- Opening names come from the Lichess
  [chess-openings](https://github.com/lichess-org/chess-openings) tables (CC0).
- [chess.js](https://github.com/jhlywa/chess.js) and
  [react-chessboard](https://github.com/Clariity/react-chessboard) handle rules and the board.

## Contributing

See [`docs/coding-practices.md`](docs/coding-practices.md) and [`AGENTS.md`](AGENTS.md).
