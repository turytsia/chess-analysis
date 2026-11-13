import { isCriticalLabel, type MoveAssessment } from '../../services/classify';
import type { GameMove } from '../../services/pgn';
import { useAnalysisTranslation } from '../../translations/hooks';
import { cn } from '../../utilities/cn';
import { formatMoveNumber, formatPercent } from '../../utilities/format';
import { MoveLabelIcon } from '../../components/MoveLabelIcon';
import { useLocalizeMoveLabel } from '../../utilities/useLocalizeMoveLabel';

interface CriticalMomentsProps {
  moves: Array<GameMove>;
  assessments: Array<MoveAssessment | undefined>;
  ply: number;
  onSelectPly: (ply: number) => void;
}

export const CriticalMoments: React.FC<CriticalMomentsProps> = ({
  moves,
  assessments,
  ply,
  onSelectPly,
}) => {
  const { t } = useAnalysisTranslation();
  const localizeLabel = useLocalizeMoveLabel();
  const moments = moves.flatMap((move, index) => {
    const assessment = assessments[index];
    return assessment && isCriticalLabel(assessment.label)
      ? [{ move, assessment }]
      : [];
  });

  if (moments.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>{t('NoCriticalMoments')}</p>
    );
  }

  return (
    <ul className='flex flex-col gap-1'>
      {moments.map(({ move, assessment }) => (
        <li key={move.ply}>
          <button
            type='button'
            aria-current={move.ply === ply}
            onClick={() => onSelectPly(move.ply)}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
              move.ply === ply && 'border-foreground/40 bg-accent'
            )}
          >
            <MoveLabelIcon label={assessment.label} />
            <span className='font-medium'>
              {formatMoveNumber(move.ply)} {move.san}
            </span>
            <span className='text-muted-foreground'>
              {localizeLabel(assessment.label)}
            </span>
            <span className='ml-auto font-mono text-xs text-muted-foreground tabular-nums'>
              {t('WinChanceLost', {
                percent: formatPercent(assessment.winLoss),
              })}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};
