import { useEffect, useRef } from 'react';

import type { MoveAssessment } from '../../services/classify';
import type { GameMove } from '../../services/pgn';
import { useAnalysisTranslation } from '../../translations/hooks';
import { cn } from '../../utilities/cn';
import { MoveLabelIcon } from './MoveLabelIcon';
import { useLocalizeMoveLabel } from './useLocalizeMoveLabel';

interface MoveListProps {
  moves: Array<GameMove>;
  assessments: Array<MoveAssessment | undefined>;
  ply: number;
  onSelectPly: (ply: number) => void;
}

interface MoveButtonProps {
  move: GameMove;
  assessment: MoveAssessment | undefined;
  isActive: boolean;
  onSelect: () => void;
}

export const MoveList: React.FC<MoveListProps> = ({
  moves,
  assessments,
  ply,
  onSelectPly,
}) => {
  const { t } = useAnalysisTranslation();
  const listRef = useRef<HTMLOListElement>(null);
  const firstPly = moves[0]?.ply ?? 1;
  const leadingBlank = moves[0]?.color === 'black' ? 1 : 0;
  const rowCount = Math.ceil((moves.length + leadingBlank) / 2);

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [ply]);

  if (moves.length === 0) {
    return <p className='text-sm text-muted-foreground'>{t('NoMoves')}</p>;
  }

  return (
    <ol
      ref={listRef}
      className='grid max-h-[max(14rem,calc(100dvh-46rem))] grid-cols-[2.5rem_1fr_1fr] content-start gap-x-1 gap-y-0.5 overflow-y-auto pr-1 text-sm'
    >
      {Array.from({ length: rowCount }, (_, row) => {
        const whiteIndex = row * 2 - leadingBlank;
        const white = moves[whiteIndex];
        const black = moves[whiteIndex + 1];

        return (
          <li key={row} className='col-span-3 grid grid-cols-subgrid'>
            <span className='self-center font-mono text-xs text-muted-foreground tabular-nums'>
              {Math.ceil(firstPly / 2) + row}.
            </span>
            {white ? (
              <MoveButton
                move={white}
                assessment={assessments[whiteIndex]}
                isActive={white.ply === ply}
                onSelect={() => onSelectPly(white.ply)}
              />
            ) : (
              <span />
            )}
            {black && (
              <MoveButton
                move={black}
                assessment={assessments[whiteIndex + 1]}
                isActive={black.ply === ply}
                onSelect={() => onSelectPly(black.ply)}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};

const MoveButton: React.FC<MoveButtonProps> = ({
  move,
  assessment,
  isActive,
  onSelect,
}) => {
  const localizeLabel = useLocalizeMoveLabel();

  return (
    <button
      type='button'
      aria-current={isActive}
      title={assessment && localizeLabel(assessment.label)}
      onClick={onSelect}
      className={cn(
        'flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-left font-medium outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
        isActive && 'bg-primary text-primary-foreground hover:bg-primary'
      )}
    >
      {assessment && <MoveLabelIcon label={assessment.label} />}
      <span>{move.san}</span>
      {assessment && (
        <span className='sr-only'>{localizeLabel(assessment.label)}</span>
      )}
    </button>
  );
};
