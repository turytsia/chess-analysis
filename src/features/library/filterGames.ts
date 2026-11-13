import { subDays } from 'date-fns';

import type { StoredGame } from '../../services/db';
import type { PlayerColor } from '../../services/evaluation';

const PERIOD_DAYS = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
} as const;
const OPENING_VARIATION_SEPARATOR = ':';

export const ALL_FILTER = 'all';

export const DEFAULT_GAME_FILTERS: GameFilters = {
  search: '',
  color: ALL_FILTER,
  outcome: ALL_FILTER,
  opening: ALL_FILTER,
  period: ALL_FILTER,
  status: ALL_FILTER,
};

type ColorFilter = typeof ALL_FILTER | PlayerColor;

type OutcomeFilter = typeof ALL_FILTER | 'win' | 'loss' | 'draw';

type PeriodFilter = typeof ALL_FILTER | keyof typeof PERIOD_DAYS;

type StatusFilter = typeof ALL_FILTER | 'analyzed' | 'pending';

export interface GameFilters {
  search: string;
  color: ColorFilter;
  outcome: OutcomeFilter;
  opening: string;
  period: PeriodFilter;
  status: StatusFilter;
}

export function filterGames(
  games: Array<StoredGame>,
  filters: GameFilters,
  now: number
): Array<StoredGame> {
  const search = filters.search.trim().toLowerCase();
  const earliest =
    filters.period === ALL_FILTER
      ? undefined
      : subDays(now, PERIOD_DAYS[filters.period]).getTime();

  return games.filter(
    (game) =>
      (filters.color === ALL_FILTER || game.userColor === filters.color) &&
      (filters.outcome === ALL_FILTER || game.outcome === filters.outcome) &&
      (filters.opening === ALL_FILTER ||
        getOpeningFamily(game.opening) === filters.opening) &&
      (earliest === undefined || game.playedAt >= earliest) &&
      (filters.status === ALL_FILTER ||
        (game.accuracy !== undefined) === (filters.status === 'analyzed')) &&
      (search.length === 0 || matchesSearch(game, search))
  );
}

export function getOpeningFamilies(games: Array<StoredGame>): Array<string> {
  const counts = games.reduce((byFamily, game) => {
    const family = getOpeningFamily(game.opening);
    return family
      ? byFamily.set(family, (byFamily.get(family) ?? 0) + 1)
      : byFamily;
  }, new Map<string, number>());

  return [...counts.entries()]
    .sort(([nameA, countA], [nameB, countB]) =>
      countB === countA ? nameA.localeCompare(nameB) : countB - countA
    )
    .map(([family]) => family);
}

function getOpeningFamily(opening: string | undefined): string | undefined {
  return opening?.split(OPENING_VARIATION_SEPARATOR)[0].trim();
}

function matchesSearch(game: StoredGame, search: string): boolean {
  return [game.white.name, game.black.name, game.opening, game.eco].some(
    (value) => value?.toLowerCase().includes(search)
  );
}
