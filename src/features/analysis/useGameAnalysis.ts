import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';

import { buildGameReport, type GameReport } from '../../services/classify';
import {
  listAnalyses,
  type StoredAnalysis,
  type StoredGame,
} from '../../services/db';
import type { PositionEval } from '../../services/evaluation';
import type { ParsedGame } from '../../services/pgn';
import { useAnalysisStore, type AnalysisRun } from '../../stores/analysisStore';
import {
  useSettingsStore,
  type EngineSettings,
} from '../../stores/settingsStore';

const NO_EVALS: Array<PositionEval> = [];

type AnalysisStatus = 'none' | 'partial' | 'outdated' | 'current';

export interface GameAnalysis {
  evals: Array<PositionEval>;
  report: GameReport;
  run: AnalysisRun | undefined;
  status: AnalysisStatus;
  isBusyElsewhere: boolean;
  depth: number | undefined;
}

export function useGameAnalysis(
  game: StoredGame,
  parsed: ParsedGame
): GameAnalysis {
  const settings = useSettingsStore((state) => state.engine);
  const activeRun = useAnalysisStore((state) => state.run);
  const analyses = useLiveQuery(() => listAnalyses(game.id), [game.id]);

  const run = activeRun?.gameId === game.id ? activeRun : undefined;
  const stored = selectAnalysis(analyses ?? [], settings);
  const evals = run?.evals ?? stored?.positions ?? NO_EVALS;

  const report = useMemo(
    () =>
      buildGameReport({
        moves: parsed.moves,
        evals,
        bookPlies: game.bookPlies,
      }),
    [parsed.moves, evals, game.bookPlies]
  );

  return {
    evals,
    report,
    run,
    status: getStatus(stored, settings),
    isBusyElsewhere: activeRun !== undefined && run === undefined,
    depth: run?.depth ?? stored?.depth,
  };
}

function selectAnalysis(
  analyses: Array<StoredAnalysis>,
  settings: EngineSettings
): StoredAnalysis | undefined {
  const exact = analyses.find((analysis) =>
    matchesSettings(analysis, settings)
  );
  if (exact?.isComplete) {
    return exact;
  }
  const [latestComplete] = analyses
    .filter(({ isComplete }) => isComplete)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return latestComplete ?? exact;
}

function getStatus(
  stored: StoredAnalysis | undefined,
  settings: EngineSettings
): AnalysisStatus {
  if (!stored) {
    return 'none';
  }
  if (!stored.isComplete) {
    return 'partial';
  }
  return matchesSettings(stored, settings) ? 'current' : 'outdated';
}

function matchesSettings(
  analysis: StoredAnalysis,
  settings: EngineSettings
): boolean {
  return (
    analysis.depth === settings.depth && analysis.multiPv === settings.multiPv
  );
}
