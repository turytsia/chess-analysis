import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';

interface StepControlsProps {
  canStepBack: boolean;
  canStepForward: boolean;
  onStep: (delta: number) => void;
}

export const StepControls: React.FC<StepControlsProps> = ({
  canStepBack,
  canStepForward,
  onStep,
}) => {
  const { t } = useTranslation();

  return (
    <div className='flex items-center gap-1'>
      <Tooltip content={t('FirstMove')}>
        <Button
          variant='outline'
          size='icon'
          aria-label={t('FirstMove')}
          disabled={!canStepBack}
          onClick={() => onStep(-Infinity)}
        >
          <ChevronFirst />
        </Button>
      </Tooltip>
      <Tooltip content={t('PreviousMove')}>
        <Button
          variant='outline'
          size='icon'
          aria-label={t('PreviousMove')}
          disabled={!canStepBack}
          onClick={() => onStep(-1)}
        >
          <ChevronLeft />
        </Button>
      </Tooltip>
      <Tooltip content={t('NextMove')}>
        <Button
          variant='outline'
          size='icon'
          aria-label={t('NextMove')}
          disabled={!canStepForward}
          onClick={() => onStep(1)}
        >
          <ChevronRight />
        </Button>
      </Tooltip>
      <Tooltip content={t('LastMove')}>
        <Button
          variant='outline'
          size='icon'
          aria-label={t('LastMove')}
          disabled={!canStepForward}
          onClick={() => onStep(Infinity)}
        >
          <ChevronLast />
        </Button>
      </Tooltip>
    </div>
  );
};
