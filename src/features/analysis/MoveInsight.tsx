import { EngineLines } from '../../components/EngineLines';
import type { MoveAssessment } from '../../services/classify';
import type { MoveRemark } from '../../services/commentary';
import type { PositionEval } from '../../services/evaluation';
import type { GameMove } from '../../services/pgn';
import { useAnalysisTranslation } from '../../translations/hooks';
import { formatEval, formatMoveNumber } from '../../utilities/format';
import { MoveLabelIcon } from '../../components/MoveLabelIcon';
import { useLocalizeMoveLabel } from '../../utilities/useLocalizeMoveLabel';
import { MoveComment } from './MoveComment';

interface MoveInsightProps {
  fen: string;
  ply: number;
  move: GameMove | undefined;
  assessment: MoveAssessment | undefined;
  remarks: Array<MoveRemark>;
  isOwnMove: boolean;
  evaluation: PositionEval | undefined;
}

export const MoveInsight: React.FC<MoveInsightProps> = ({
  fen,
  ply,
  move,
  assessment,
  remarks,
  isOwnMove,
  evaluation,
}) => {
  const { t } = useAnalysisTranslation();
  const localizeLabel = useLocalizeMoveLabel();

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-col gap-1'>
          <div className='flex items-center gap-2'>
            {assessment && (
              <MoveLabelIcon label={assessment.label} className='size-5' />
            )}
            <span className='truncate text-base font-semibold'>
              {move
                ? `${formatMoveNumber(move.ply)} ${move.san}`
                : t('StartingPosition')}
            </span>
            {assessment && (
              <span className='text-sm text-muted-foreground'>
                {localizeLabel(assessment.label)}
              </span>
            )}
          </div>
          {move && !assessment && (
            <p className='text-sm text-muted-foreground'>
              {t('MoveNotAnalyzed')}
            </p>
          )}
        </div>
        <span className='font-mono text-sm font-medium tabular-nums'>
          {formatEval(evaluation)}
        </span>
      </div>
      <MoveComment remarks={remarks} isOwnMove={isOwnMove} />
      {evaluation && (
        <EngineLines fen={fen} ply={ply} evaluation={evaluation} />
      )}
    </div>
  );
};
