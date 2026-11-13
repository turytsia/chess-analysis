import { create } from 'zustand';

import { analyzePositions } from '../services/analysis';
import { buildGameReport } from '../services/classify';
import {
  listAnalyses,
  saveAnalysis,
  setGameAccuracy,
  type StoredGame,
} from '../services/db';
import { createEngine, type Engine } from '../services/engine';
import type { PositionEval } from '../services/evaluation';
import { getPositions, type ParsedGame } from '../services/pgn';
import { useEngineStatsStore } from './engineStatsStore';
import { useSettingsStore } from './settingsStore';

type AnalysisOutcome = 'completed' | 'cancelled' | 'failed' | 'busy';

export interface AnalysisRun {
  gameId: string;
  depth: number;
  multiPv: number;
  total: number;
  evals: Array<PositionEval>;
}

interface AnalysisState {
  run: AnalysisRun | undefined;
  startAnalysis: (
    game: StoredGame,
    parsed: ParsedGame
  ) => Promise<AnalysisOutcome>;
  cancelAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisState>()((set, get) => {
  let enginePromise: Promise<Engine> | undefined;
  let abortController: AbortController | undefined;

  const releaseEngine = (): void => {
    enginePromise?.then((engine) => engine.terminate()).catch(() => undefined);
    enginePromise = undefined;
  };

  return {
    run: undefined,

    startAnalysis: async (game, parsed) => {
      if (get().run) {
        return 'busy';
      }
      const { depth, multiPv, threads, hashMb } =
        useSettingsStore.getState().engine;
      const fens = getPositions(parsed);
      const controller = new AbortController();
      abortController = controller;
      set({
        run: { gameId: game.id, depth, multiPv, total: fens.length, evals: [] },
      });

      try {
        const stored = (await listAnalyses(game.id)).find(
          (analysis) => analysis.depth === depth && analysis.multiPv === multiPv
        );
        enginePromise ??= createEngine();
        const engine = await enginePromise;
        await engine.configure({ threads, hashMb, multiPv });
        await engine.startNewGame();

        const evals = await analyzePositions({
          engine,
          fens,
          depth,
          completed: stored?.positions ?? [],
          signal: controller.signal,
          onProgress: (progress) =>
            set(({ run }) => ({ run: run && { ...run, evals: progress } })),
          onSearched: (search) =>
            useEngineStatsStore.getState().recordSearch(search, depth, multiPv),
        });

        const isComplete = evals.length === fens.length;
        await saveAnalysis({
          gameId: game.id,
          depth,
          multiPv,
          positions: evals,
          isComplete,
          updatedAt: Date.now(),
        });
        const { accuracy } = buildGameReport({
          moves: parsed.moves,
          evals,
          bookPlies: game.bookPlies,
        });
        if (accuracy) {
          await setGameAccuracy(game.id, accuracy);
        }
        return isComplete ? 'completed' : 'cancelled';
      } catch {
        releaseEngine();
        return 'failed';
      } finally {
        set({ run: undefined });
      }
    },

    cancelAnalysis: () => abortController?.abort(),
  };
});
