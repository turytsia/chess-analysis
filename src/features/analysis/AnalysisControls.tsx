import { Play, Settings2, Square } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/ui/Progress';
import { Tooltip } from '../../components/ui/Tooltip';
import type { StoredGame } from '../../services/db';
import type { ParsedGame } from '../../services/pgn';
import { useAnalysisStore } from '../../stores/analysisStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAnalysisTranslation } from '../../translations/hooks';
import { EngineSettingsDialog } from './EngineSettingsDialog';
import type { GameAnalysis } from './useGameAnalysis';

interface AnalysisControlsProps {
  game: StoredGame;
  parsed: ParsedGame;
  analysis: GameAnalysis;
}

export const AnalysisControls: React.FC<AnalysisControlsProps> = ({
  game,
  parsed,
  analysis,
}) => {
  const { t } = useAnalysisTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const startAnalysis = useAnalysisStore((state) => state.startAnalysis);
  const cancelAnalysis = useAnalysisStore((state) => state.cancelAnalysis);
  const settingsDepth = useSettingsStore((state) => state.engine.depth);
  const { run, status, isBusyElsewhere, depth } = analysis;

  const handleAnalyze = async (): Promise<void> => {
    const outcome = await startAnalysis(game, parsed);
    if (outcome === 'failed') {
      toast.error(t('AnalysisFailed'));
    }
  };

  const analyzeLabel = {
    none: t('AnalyzeGame'),
    partial: t('ResumeAnalysis'),
    outdated: t('ReanalyzeAtDepth', { depth: settingsDepth }),
    current: t('AnalyzeGame'),
  }[status];

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {run && (
        <div className='flex min-w-56 flex-1 items-center gap-3'>
          <div className='flex flex-1 flex-col gap-1.5'>
            <span className='text-xs text-muted-foreground'>
              {t('AnalysisProgress', {
                completed: run.evals.length,
                total: run.total,
                depth: run.depth,
              })}
            </span>
            <Progress
              aria-label={t('AnalysisProgressLabel')}
              value={run.evals.length}
              max={run.total}
            />
          </div>
          <Button variant='outline' size='sm' onClick={cancelAnalysis}>
            <Square />
            {t('Cancel')}
          </Button>
        </div>
      )}
      {!run && status !== 'none' && depth !== undefined && (
        <Badge variant={status === 'partial' ? 'muted' : 'secondary'}>
          {status === 'partial'
            ? t('PartiallyAnalyzedAtDepth', { depth })
            : t('AnalyzedAtDepth', { depth })}
        </Badge>
      )}
      {!run && status !== 'current' && (
        <Tooltip
          content={
            isBusyElsewhere ? t('AnotherAnalysisRunning') : t('AnalyzeHint')
          }
        >
          <span>
            <Button
              size='sm'
              disabled={isBusyElsewhere || parsed.moves.length === 0}
              onClick={handleAnalyze}
            >
              <Play />
              {analyzeLabel}
            </Button>
          </span>
        </Tooltip>
      )}
      <Tooltip content={t('EngineSettings')}>
        <Button
          variant='outline'
          size='iconSm'
          aria-label={t('EngineSettings')}
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings2 />
        </Button>
      </Tooltip>
      <EngineSettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
};
