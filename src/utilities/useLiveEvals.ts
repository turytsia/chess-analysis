import { useEffect, useRef, useState } from 'react';

import type { PositionEval } from '../services/evaluation';
import { evaluateLive } from '../services/liveEngine';
import { useEngineStatsStore } from '../stores/engineStatsStore';
import { useSettingsStore } from '../stores/settingsStore';

const FEN_SEPARATOR = '\n';
const NO_RESULTS: Record<string, PositionEval> = {};

interface LiveState {
  settingsKey: string;
  results: Record<string, PositionEval>;
  hasFailed: boolean;
}

interface LiveEvaluations {
  evals: Array<PositionEval | undefined>;
  hasFailed: boolean;
}

/*
 * Evaluates a list of positions with the live engine and remembers every
 * result, so stepping back to a position shows its evaluation at once. The
 * active position is searched first and the others follow, which is what lets
 * a move be judged: that needs the position before it and the one after it.
 * A position has no result until its search is finished. Results are dropped
 * when the depth or the number of lines changes.
 */
export function useLiveEvals(
  fens: Array<string>,
  activeIndex: number
): LiveEvaluations {
  const { depth, threads, hashMb, multiPv } = useSettingsStore(
    (state) => state.engine
  );
  const recordSearch = useEngineStatsStore((state) => state.recordSearch);
  const settingsKey = `${depth}:${multiPv}`;
  const [state, setState] = useState<LiveState>({
    settingsKey,
    results: NO_RESULTS,
    hasFailed: false,
  });
  const results =
    state.settingsKey === settingsKey ? state.results : NO_RESULTS;
  const latestResults = useRef(results);
  const fensKey = fens.join(FEN_SEPARATOR);

  useEffect(() => {
    latestResults.current = results;
  });

  useEffect(() => {
    const queue = toQueue(fensKey, activeIndex);
    if (queue.length === 0) {
      return undefined;
    }
    const controller = new AbortController();

    const evaluateQueue = async (): Promise<void> => {
      for (const fen of queue) {
        if (controller.signal.aborted) {
          return;
        }
        if (!latestResults.current[fen]) {
          const evaluation = await evaluateLive({
            fen,
            depth,
            options: { threads, hashMb, multiPv },
            signal: controller.signal,
            onSearched: (search) => recordSearch(search, depth, multiPv),
          });
          evaluation &&
            setState((current) => ({
              settingsKey,
              hasFailed: false,
              results: {
                ...(current.settingsKey === settingsKey ? current.results : {}),
                [fen]: evaluation,
              },
            }));
        }
      }
    };

    evaluateQueue().catch(() => {
      if (!controller.signal.aborted) {
        setState((current) => ({ ...current, hasFailed: true }));
      }
    });
    return () => controller.abort();
  }, [
    fensKey,
    activeIndex,
    settingsKey,
    depth,
    threads,
    hashMb,
    multiPv,
    recordSearch,
  ]);

  return {
    evals: fens.map((fen) => results[fen]),
    hasFailed: state.hasFailed,
  };
}

function toQueue(fensKey: string, activeIndex: number): Array<string> {
  const fens = fensKey.length > 0 ? fensKey.split(FEN_SEPARATOR) : [];
  const active = fens[activeIndex];
  return [...new Set(active === undefined ? fens : [active, ...fens])];
}
