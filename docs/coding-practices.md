# Coding practices

Every contributor, human or agent, follows these practices. Reviewers make sure no new violations
enter the codebase, and pre-existing violations should be fixed whenever it is feasible.

Lint and formatting rules are enforced by tooling (`pnpm lint`, `pnpm format`). This document covers
what the tooling cannot check.

## Project rules

#### Order every file the same way

1. imports
2. constants
3. types
4. main functions (what the file exports)
5. helpers (everything that only supports the main functions)

Helpers are written as `function` declarations so they can sit below the code that calls them.
A module-level value that must be created once (a cache, a database handle) goes with the constants
and is built by a helper declared at the bottom.

```typescript
import { subDays } from 'date-fns';

const PERIOD_DAYS = { week: 7, month: 30 } as const;

export interface GameFilters {
  period: keyof typeof PERIOD_DAYS;
}

export function filterGames(games: Array<StoredGame>, filters: GameFilters): Array<StoredGame> {
  return games.filter((game) => isRecent(game, filters));
}

function isRecent(game: StoredGame, filters: GameFilters): boolean {
  // ...
}
```

#### Export only what is imported somewhere

A declaration is exported only when another module imports it. If the last import goes away, remove
the `export` too. This includes types that only appear in the signature of an exported function:
they stay private until another file needs to name them. `pnpm lint:unused` reports exports that
no other file references, along with unused files and dependencies, and it runs in CI.

#### Comment only complicated functionality

Default to no comment. Code must say what it does through naming and structure. A comment is
justified only when it records something a reader cannot get from the code itself: the reasoning
behind a non-obvious algorithm, an external contract, or an invariant that is easy to break.

Never restate what the code says, never narrate control flow, and never use comments to describe
your own edits.

Don't:
```typescript
// loop over the moves and count the blunders
```
Do:
```typescript
/*
 * Game accuracy follows the Lichess model: every move's accuracy is weighted by how volatile the
 * win probability is around it, and the result is the mean of that weighted average and the
 * harmonic mean, which punishes a few terrible moves more than a plain average.
 */
```

#### Keep services free of React

Everything in `src/services` is plain TypeScript: no React, no hooks, no translations, no DOM
components. Services return data and throw typed errors; the UI turns them into text. This keeps
the chess logic easy to test and to swap.

#### Keep the app static and deployable to GitHub Pages

There is no backend. The site must work from a sub-folder with no control over response headers:

- `vite.config.ts` uses `base: './'`; never write absolute asset URLs.
- Routing is hash-based (`src/utilities/router.ts`); do not add path-based routes.
- Multi-threaded Stockfish needs cross-origin isolation. `public/coi-serviceworker.js` provides it
  on GitHub Pages, so every outside resource must be requested with CORS. Do not embed
  cross-origin images, fonts or scripts; self-host them.
- Engine files and the service worker are copied into `public/` by `scripts/copyEngineAssets.mjs`
  on install. They are not committed.

#### Store data in the browser only

- Games, analyses and fetched archives live in IndexedDB, behind the
  functions exported by `src/services/db.ts`. No other module touches the database directly.
- Settings, including the chess.com username the user typed in, live in `localStorage` through
  `src/stores/settingsStore.ts`. Games are only loaded after the user provides that input.

#### Follow the visual language

The interface follows the Vercel/v0 look: neutral monochrome surfaces, hairline borders, small
radii, Geist Sans and Geist Mono, restrained use of color.

- Build screens from the primitives in `src/components/ui`. Add a new primitive there when one is
  missing; do not create one-off presentational components inside a feature.
- Style with Tailwind utility classes and the theme tokens defined in `src/index.css`. Do not add
  separate CSS files. Use an inline `style` only for values computed at run time (a bar's height)
  or when a third-party component accepts nothing else.
- Color carries meaning only for move labels, and a label color always comes with its icon and its
  name. Text stays in the foreground or muted color. Every color must work in light and dark mode.
- Charts follow the same rules: one axis, thin marks, solid hairline grid, a tooltip on hover, and
  every value also reachable without the tooltip.
- A page that shows a chessboard fits the window on large screens and never scrolls as a whole.
  Wrap it in `BoardPage`, lay it out with `BoardLayout`, and let long content scroll inside its
  own card. On small screens the same page stacks and scrolls normally.
- Show dates with `RelativeDate` ("Today", "Yesterday", "3 days ago"), not as raw dates.

## General

#### Include an issue link in every TODO comment

Every temporary solution is marked by a comment that links to the issue where the proper solution
is tracked, so a reader can check whether the comment is still relevant.

Don't:
```typescript
// temporary until the engine supports this
```
Do:
```typescript
// temporary until https://github.com/<owner>/<repo>/issues/42
```

#### Use `date-fns` for date manipulation

Do not do date arithmetic or formatting by hand.

Don't:
```typescript
const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
```
Do:
```typescript
const weekAgo = subDays(now, 7).getTime();
```

#### Use optional chaining for nested access

Never reach into nested data with a string-path helper that returns `any`. Optional chaining keeps
the types.

Don't:
```typescript
const bestMove = get(evaluation, 'lines[0].pv[0]'); // any
```
Do:
```typescript
const bestMove = evaluation?.lines[0]?.pv[0]; // string | undefined
```

#### Use type annotations instead of type assertions with object literals

An annotation is easier to read, because the type comes first, and safer, because any deviation of
the literal from the type is reported. Assertions remain acceptable where the type system really
has to be persuaded, which is mostly in test mocks.

Don't:
```typescript
const settings = {
  // long literal
} as EngineSettings;
```
Do:
```typescript
const settings: EngineSettings = {
  // long literal
};
```

#### Use proper camelCase/PascalCase

Only the first letter of every word is uppercase, whatever the natural casing of the word is.

Don't: `parsePGN`, `UCIEngine`, `toEPD`, `multiPV`

Do: `parsePgn`, `UciEngine`, `toEpd`, `multiPv`

#### Use camelCase/PascalCase in file names and folder names

- Components: PascalCase, e.g. `MoveList.tsx`, `EngineSettingsDialog.tsx`. A name that is entirely
  an acronym keeps its standard form.
- Everything else (services, stores, hooks, utilities, data): camelCase, e.g. `gameRecord.ts`,
  `useGameAnalysis.ts`.

#### Use `Array<MyType>` instead of `MyType[]`

Code is read more often than it is written. That a value is an array is the most important fact
about it, so the `Array` keyword comes first.

Don't:
```typescript
const moves: GameMove[] = [];
```
Do:
```typescript
const moves: Array<GameMove> = [];
```

#### Use singular names for enums

An enum is a type, not a collection.

Don't:
```typescript
enum MoveLabels {
  Best,
  Blunder,
}
```
Do:
```typescript
enum MoveLabel {
  Best,
  Blunder,
}
```

#### Distinguish optional parameters and mandatory parameters that may be undefined

`param?: T` may be omitted. `param: T | undefined` must always be passed, even when the value is
`undefined`. Use the second form whenever leaving the argument out would be a mistake.

Don't:
```typescript
function formatEval(evaluation?: PositionEval): string {
  // ...
}

formatEval(); // forgot the argument, and TypeScript stays silent
```
Do:
```typescript
function formatEval(evaluation: PositionEval | undefined): string {
  // ...
}

formatEval(); // TS2554: Expected 1 arguments, but got 0.
```

#### Use SCREAMING_SNAKE_CASE for global constants

A constant that is not scoped to a single function is written in SCREAMING_SNAKE_CASE, so a reader
who meets it knows it is defined elsewhere. This matters most for exported constants.

Don't:
```typescript
export const defaultDepth = 16;
```
Do:
```typescript
export const DEFAULT_DEPTH = 16;
```

#### Export declarations at the point of definition

Don't:
```typescript
interface GameMove {
  san: string;
}

export { GameMove };
```
Do:
```typescript
export interface GameMove {
  san: string;
}
```

#### Use named exports instead of `default` exports

Config files that a tool loads by its default export (`vite.config.ts`, `eslint.config.mjs`) are
the only exception. Lazy-loaded screens keep their named export and are mapped at the import site:

```typescript
const AnalysisView = lazy(() =>
  import('./features/analysis/AnalysisView').then((module) => ({
    default: module.AnalysisView,
  }))
);
```

#### Use `as const` when declaring global object constants

It prevents accidental mutation of shared objects.

Don't:
```typescript
export const ENGINE_LIMITS = {
  minDepth: 12,
  maxDepth: 30,
};

ENGINE_LIMITS.maxDepth = 99; // no compile-time error
```
Do:
```typescript
export const ENGINE_LIMITS = {
  minDepth: 12,
  maxDepth: 30,
} as const;

ENGINE_LIMITS.maxDepth = 99; // TS2540: Cannot assign to 'maxDepth' because it is a read-only property.
```

#### Avoid nested ternary operators

Don't:
```typescript jsx
return !result ? null : !result.game ? <GameNotFound /> : <GameScreen game={result.game} />;
```
Do:
```typescript jsx
if (!result) {
  return null;
}
return result.game ? <GameScreen game={result.game} /> : <GameNotFound />;
```

#### Prefer pure functions to impure functions

Pure functions are predictable and easy to test. Keep state in the stores, the database module and
the engine wrapper; everything else takes its inputs as arguments and returns a result.

Don't:
```typescript
let total = 0;

function addToTotal(value: number): void {
  total += value;
}
```
Do:
```typescript
function addValues(first: number, second: number): number {
  return first + second;
}
```

## React

#### Minimize `useEffect`

`useEffect` is an escape hatch for synchronizing with external systems. Do not use it for logic
that can be expressed differently.

- **Derive values during render.** If a value can be calculated from props or state, compute it in
  the component body instead of syncing it with `useEffect` + `setState`.
- **Move event-driven logic into event handlers.** Code that runs because the user did something
  belongs in the handler, not in an Effect triggered by a state change.
- **Reset state with `key`.** To reset a component when a prop changes, pass a `key`.
- **Avoid Effect chains.** Effects that set state to trigger other Effects cause cascading
  re-renders. Consolidate the logic in one handler or compute during render.
- **Notify parents during events.** Call parent callbacks from the handler that caused the change.

Legitimate uses: subscribing to a browser event, a timer with cleanup, scrolling a DOM node into
view.

Don't:
```typescript
const [evalText, setEvalText] = useState('');
useEffect(() => {
  setEvalText(formatEval(evaluation));
}, [evaluation]);
```
Do:
```typescript
const evalText = formatEval(evaluation);
```

#### Minimize `useMemo` and `useCallback`

Memoize only when there is a real performance need.

Memoize when:
- **The computation is expensive**: parsing a PGN, building a game report, filtering a library of
  thousands of games.
- **A downstream `memo()` component needs a stable reference.**

Do not memoize simple derivations, string building, small array maps, or event handlers that are
only passed to native DOM elements.

Don't:
```tsx
const isFirstMove = useMemo(() => ply === 0, [ply]);
const handleClick = useCallback(() => onSelectPly(0), [onSelectPly]);
```
Do:
```tsx
const isFirstMove = ply === 0;
return <Button disabled={isFirstMove} onClick={() => onSelectPly(0)} />;
```

#### Hoist constants and pure functions outside components

Objects, arrays and functions that do not depend on props, state or hooks are defined outside the
component body. Declared inside, they get a new identity on every render.

Don't:
```typescript
export const EvalGraph: React.FC<EvalGraphProps> = ({ points }) => {
  const margin = { top: 8, right: 8, bottom: 0, left: 8 };
  return <AreaChart data={points} margin={margin} />;
};
```
Do:
```typescript
const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 8 } as const;

export const EvalGraph: React.FC<EvalGraphProps> = ({ points }) => {
  return <AreaChart data={points} margin={CHART_MARGIN} />;
};
```

#### Prefer spreading component properties

Destructure props in the parameter list. Take the whole object only when there is a specific reason.

Don't:
```typescript
export const EvalBar: React.FC<EvalBarProps> = (props) => {
  // ...
};
```
Do:
```typescript
export const EvalBar: React.FC<EvalBarProps> = ({ evaluation, orientation }) => {
  // ...
};
```

#### Use `<></>` instead of `<React.Fragment></React.Fragment>` when possible

Use the long form only when the fragment needs a `key`.

#### Provide a hook instead of using `React.useContext()` directly

When a context is introduced, export a hook that reads it and throws a clear error when the
provider is missing, instead of letting consumers call `useContext` themselves.

```typescript jsx
export function useBoardTheme(): BoardThemeValue {
  const context = React.useContext(BoardThemeContext);
  if (!context) {
    throw new Error('useBoardTheme must be used within a BoardThemeProvider');
  }
  return context;
}
```

#### Prefer `condition && <Component />` syntax

Don't:
```jsx
<div>{assessment ? <MoveLabelIcon label={assessment.label} /> : null}</div>
```
Do:
```jsx
<div>{assessment && <MoveLabelIcon label={assessment.label} />}</div>
```

#### Split long JSX expressions

When a JSX expression becomes uncomfortably long, extract its logical parts into separate
components. Use real components, not functions that return JSX snippets. A component used by a
single file stays in that file, below the main component, and is not exported.

Don't:
```typescript jsx
export const GameLibrary: React.FC = () => (
  <div>
    {renderPagination()}
  </div>
);

function renderPagination(): React.ReactElement {
  // ...
}
```
Do:
```typescript jsx
export const GameLibrary: React.FC = () => (
  <div>
    <Pagination />
  </div>
);

const Pagination: React.FC = () => {
  // ...
};
```

## Internationalization (i18n)

Translations live in `src/translations/namespaces`. Keys are type-checked: a key that does not
exist fails `pnpm compile`.

#### All user facing strings must be i18n-ready

No user-visible text is hard-coded in a component. This includes `aria-label`, `title` and
`placeholder` attributes. Chess notation (`Nf3`, `!!`, `1-0`) is not text and is not translated.

Don't:
```typescript jsx
<Button aria-label='Flip board' />
```
Do:
```typescript jsx
const { t } = useAnalysisTranslation();

<Button aria-label={t('FlipBoard')} />
```

#### Use PascalCase for translation keys

`i18next` shows the key itself when a translation is missing. `FlipBoard` on screen is easy to
spot; a natural-language key would hide the problem. PascalCase keys are also easy to search for.

Don't:
```json
{ "Flip the board": "Flip the board" }
```
Do:
```json
{ "FlipBoard": "Flip board" }
```

#### Prefer feature namespaces for feature-specific strings

A string used by a single feature goes into that feature's file (`en-library.json`,
`en-analysis.json`) and is read through the feature's hook from
`src/translations/hooks.ts`. Shared components use `useTranslation()` and the main file,
`en-translation.json`.

#### Avoid duplicate translations

Before adding a string, search the namespace files for its English value.

1. No match: add it to your feature's namespace.
2. A match in the main namespace: use that key. Feature hooks fall back to the main namespace.
3. A match in another feature's namespace: move it to the main namespace and use it from both.

Reuse a string only when the meaning is the same. Two different meanings that happen to share an
English word get two keys.

#### Use a single translation hook per component

Because feature hooks fall back to the main namespace, a component never needs two translation
hooks. If it needs a string owned by another feature, move that string to the main namespace.

#### Avoid nested translation keys

Nested keys cannot be found by searching for the key, and they invite duplicates.

Don't:
```json
{ "Engine": { "Settings": { "Depth": "Depth" } } }
```
Do:
```json
{ "Depth": "Depth" }
```

#### Don't compute translation keys at run time

The first argument of every translation function is a hard-coded string. A computed key cannot be
found in the code, so it looks unused and gets deleted.

Don't:
```typescript
const text = t(label);
const title = t(`Theme${capitalize(theme)}`);
```
Do:
```typescript
const text = t('Blunder');
```

#### Use mapping functions for dynamic values

When the text depends on a run-time value (a move label, a time class, an error code), map every
known value to its own static `t` call. The mapping lives in a hook when several components need it.

```typescript
export function useLocalizeTimeClass(): (timeClass: TimeClass) => string {
  const { t } = useTranslation();

  return (timeClass) =>
    ({
      bullet: t('Bullet'),
      blitz: t('Blitz'),
      rapid: t('Rapid'),
      daily: t('Daily'),
      unknown: t('UnknownTimeControl'),
    }[timeClass]);
}
```

#### Use proper pluralization

Languages differ in how they form plurals. Let `i18next` choose the form.

Don't:
```json
{ "OneGame": "1 game", "ManyGames": "{{count}} games" }
```
```typescript
count === 1 ? t('OneGame') : t('ManyGames', { count });
```
Do:
```json
{ "GamesWithCount_one": "{{count}} game", "GamesWithCount_other": "{{count}} games" }
```
```typescript
t('GamesWithCount', { count });
```

#### Avoid string interpolation or concatenation of translations

Do not build a sentence out of several translations, and do not pass one translation into another.
Word order and grammar differ between languages. Accept some repetition instead. Interpolating
data (a player name, a move, a number) is fine.

Don't:
```typescript
const text = `${t('Best')} ${t('Move')}`;
```
Do:
```typescript
const text = t('BestMove');
```

#### Use the `<Trans>` component for styling inside translations

Don't:
```typescript jsx
<>
  {t('ExploringAfter')} <strong>{move}</strong>
</>
```
Do:
```json
{ "ExploringAfterMove": "Exploring after <move>{{move}}</move>" }
```
```typescript jsx
<Trans t={t} i18nKey='ExploringAfterMove' values={{ move }} components={{ move: <strong /> }} />
```

## Unit tests

Tests run with Vitest and sit next to the file they cover (`classify.ts` → `classify.test.ts`).

#### Prefer real implementations over mocks

Keep as much real code active as possible. Use the real PGN parser, the real opening tree and real
positions. Reserve `vi.mock` and stubbed globals for things that cannot run in the test
environment (`fetch`, a Web Worker) and for dependencies whose state the test must control.

Don't:
```typescript
vi.mock('./pgn', () => ({ parsePgn: () => ({ moves: fakeMoves }) }));
```
Do:
```typescript
const { moves } = parsePgn('1. e4 c6 2. d4 d5 *');
```

Test modules must not import `i18next` or the translation files. Tests rely on the real setup.

#### Minimize usage of `data-test-id` attributes

Query components the way a user finds them: by role, label or text.

#### Prefer DAMP to DRY

In tests, descriptive and meaningful phrases beat reuse. Do not hide values in shared variables
just because they appear twice. Literals in the test body save the reader from scrolling.

#### Test description should read like a specification

Reading all descriptions of a file should teach how the unit works, and a failing test should say
which behaviour broke.

Don't:
```typescript
it('handles sacrifices', () => {});
```
Do:
```typescript
it('should not label a sacrifice as Brilliant when the game was already won', () => {});
```

#### Only mock what is relevant for the test

Test data factories take optional overrides and provide defaults for the rest, so each test states
only the inputs it is about.

Don't:
```typescript
const game = { id: 'a', source: 'pgn', pgn: '', sanMoves: [], /* ten more fields */ outcome: 'draw' };
```
Do:
```typescript
const game = gameOf({ outcome: 'draw' });
```

#### Use `expect` for test expectations and when necessary

State the expectation with `expect`. A bare query is not an assertion. When you only need to wait
for an element before interacting with it, use `await findBy*` instead of wrapping `expect` in
`waitFor`.

Don't:
```typescript
screen.getByRole('alert', { name: 'Analysis failed' });
```
Do:
```typescript
expect(screen.getByRole('alert', { name: 'Analysis failed' })).toBeVisible();
```

#### Name the top-level `describe` after the unit

Every test file has a single top-level `describe` named after the module, function, component or
hook under test. Keep nesting shallow: prefer flat `it()` cases and `it.each()` for parameterized
tests, and add a nested `describe` only for a group that covers one function or shares a setup.

#### Prefer exact strings over regex in queries

Exact strings are easier to read and catch wording regressions. Use a regex only for a partial
match of a long paragraph or for dynamic content.

#### Prefer `toBeVisible()` to `toBeInTheDocument()`

`toBeVisible()` fails when the element exists but is hidden, which is what a user-facing assertion
should do. Keep `toBeInTheDocument()` for the rare case of asserting a hidden element.
