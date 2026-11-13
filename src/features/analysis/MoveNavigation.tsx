import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  FlipVertical2,
  Lightbulb,
  SkipForward,
} from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Tooltip } from '../../components/ui/Tooltip';
import { useAnalysisTranslation } from '../../translations/hooks';

interface MoveNavigationProps {
  ply: number;
  lastPly: number;
  nextCriticalPly: number | undefined;
  isBestMoveShown: boolean;
  onSelectPly: (ply: number) => void;
  onFlipBoard: () => void;
  onToggleBestMove: () => void;
}

export const MoveNavigation: React.FC<MoveNavigationProps> = ({
  ply,
  lastPly,
  nextCriticalPly,
  isBestMoveShown,
  onSelectPly,
  onFlipBoard,
  onToggleBestMove,
}) => {
  const { t } = useAnalysisTranslation();

  return (
    <div className='flex items-center justify-between gap-2'>
      <div className='flex items-center gap-1'>
        <Tooltip content={t('FirstMove')}>
          <Button
            variant='outline'
            size='icon'
            aria-label={t('FirstMove')}
            disabled={ply === 0}
            onClick={() => onSelectPly(0)}
          >
            <ChevronFirst />
          </Button>
        </Tooltip>
        <Tooltip content={t('PreviousMove')}>
          <Button
            variant='outline'
            size='icon'
            aria-label={t('PreviousMove')}
            disabled={ply === 0}
            onClick={() => onSelectPly(ply - 1)}
          >
            <ChevronLeft />
          </Button>
        </Tooltip>
        <Tooltip content={t('NextMove')}>
          <Button
            variant='outline'
            size='icon'
            aria-label={t('NextMove')}
            disabled={ply === lastPly}
            onClick={() => onSelectPly(ply + 1)}
          >
            <ChevronRight />
          </Button>
        </Tooltip>
        <Tooltip content={t('LastMove')}>
          <Button
            variant='outline'
            size='icon'
            aria-label={t('LastMove')}
            disabled={ply === lastPly}
            onClick={() => onSelectPly(lastPly)}
          >
            <ChevronLast />
          </Button>
        </Tooltip>
      </div>
      <div className='flex items-center gap-1'>
        <Button
          variant='outline'
          size='sm'
          disabled={nextCriticalPly === undefined}
          onClick={() =>
            nextCriticalPly !== undefined && onSelectPly(nextCriticalPly)
          }
        >
          <SkipForward />
          {t('NextCriticalMoment')}
        </Button>
        <Tooltip content={t('ToggleBestMove')}>
          <Button
            variant={isBestMoveShown ? 'secondary' : 'ghost'}
            size='icon'
            aria-label={t('ToggleBestMove')}
            aria-pressed={isBestMoveShown}
            onClick={onToggleBestMove}
          >
            <Lightbulb />
          </Button>
        </Tooltip>
        <Tooltip content={t('FlipBoard')}>
          <Button
            variant='ghost'
            size='icon'
            aria-label={t('FlipBoard')}
            onClick={onFlipBoard}
          >
            <FlipVertical2 />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
