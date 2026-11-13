import { RotateCcw } from 'lucide-react';

import { EngineLines } from '../../components/EngineLines';
import { MoveLine } from '../../components/MoveLine';
import { MoveVerdict } from '../../components/MoveVerdict';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { MoveAssessment } from '../../services/classify';
import type { MoveRemark } from '../../services/commentary';
import type { PositionEval } from '../../services/evaluation';
import type { GameMove } from '../../services/pgn';
import { useAnalysisTranslation } from '../../translations/hooks';
import { formatEval, formatMoveNumber } from '../../utilities/format';
import { MoveComment } from './MoveComment';

interface ExplorationPanelProps {
  fen: string;
  basePly: number;
  baseMove: GameMove | undefined;
  variation: Array<GameMove>;
  assessments: Array<MoveAssessment | undefined>;
  remarks: Array<MoveRemark>;
  isOwnMove: boolean;
  cursor: number;
  evaluation: PositionEval | undefined;
  hasEngineFailed: boolean;
  onSelectCursor: (cursor: number) => void;
  onReset: () => void;
}

export const ExplorationPanel: React.FC<ExplorationPanelProps> = ({
  fen,
  basePly,
  baseMove,
  variation,
  assessments,
  remarks,
  isOwnMove,
  cursor,
  evaluation,
  hasEngineFailed,
  onSelectCursor,
  onReset,
}) => {
  const { t } = useAnalysisTranslation();
  const exploredMove = variation[cursor - 1];

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <Badge>{t('Exploring')}</Badge>
          <span className='truncate text-sm text-muted-foreground'>
            {baseMove
              ? t('ExploringAfterMove', {
                  move: `${formatMoveNumber(baseMove.ply)} ${baseMove.san}`,
                })
              : t('ExploringFromStart')}
          </span>
        </div>
        <Button variant='outline' size='sm' onClick={onReset}>
          <RotateCcw />
          {t('BackToGame')}
        </Button>
      </div>
      <MoveLine
        aria-label={t('ExploredMoves')}
        sans={variation.map(({ san }) => san)}
        firstPly={basePly + 1}
        cursor={cursor}
        onSelectCursor={onSelectCursor}
      />
      <div className='flex items-center justify-between gap-3'>
        {exploredMove ? (
          <MoveVerdict
            move={exploredMove}
            label={assessments[cursor - 1]?.label}
            isPending={!hasEngineFailed}
          />
        ) : (
          <span className='text-sm text-muted-foreground'>
            {t('ExplorationStart')}
          </span>
        )}
        <span className='font-mono text-sm font-medium tabular-nums'>
          {formatEval(evaluation)}
        </span>
      </div>
      <MoveComment remarks={remarks} isOwnMove={isOwnMove} />
      <EngineLines
        fen={fen}
        ply={basePly + cursor}
        evaluation={evaluation}
        hasFailed={hasEngineFailed}
      />
    </div>
  );
};
