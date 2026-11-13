import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { CompletedSearch } from '../services/analysis';

const STORAGE_KEY = 'chess-analysis:engine-stats';

interface SearchSettings {
  isMultiThreaded: boolean;
  depth: number;
  multiPv: number;
}

interface SearchTiming {
  count: number;
  totalMs: number;
}

interface EngineStatsState {
  engineName: string | undefined;
  timings: Record<string, SearchTiming>;
  recordSearch: (
    search: CompletedSearch,
    depth: number,
    multiPv: number
  ) => void;
}

export const useEngineStatsStore = create<EngineStatsState>()(
  persist(
    (set) => ({
      engineName: undefined,
      timings: {},
      recordSearch: (
        { engineName, isMultiThreaded, durationMs },
        depth,
        multiPv
      ) =>
        set(({ timings }) => {
          const key = getTimingKey({ isMultiThreaded, depth, multiPv });
          const previous = timings[key] ?? { count: 0, totalMs: 0 };
          return {
            engineName,
            timings: {
              ...timings,
              [key]: {
                count: previous.count + 1,
                totalMs: previous.totalMs + durationMs,
              },
            },
          };
        }),
    }),
    { name: STORAGE_KEY }
  )
);

export function getAverageSearchMs(
  timings: Record<string, SearchTiming>,
  settings: SearchSettings
): number | undefined {
  const timing = timings[getTimingKey(settings)];
  return timing && timing.count > 0 ? timing.totalMs / timing.count : undefined;
}

function getTimingKey({
  isMultiThreaded,
  depth,
  multiPv,
}: SearchSettings): string {
  return `${isMultiThreaded ? 'multi' : 'single'}:${depth}:${multiPv}`;
}
