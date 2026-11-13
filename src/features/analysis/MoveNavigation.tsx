import { SkipForward } from 'lucide-react';

import { StepControls } from '../../components/StepControls';
import { Button } from '../../components/ui/Button';
import { useAnalysisTranslation } from '../../translations/hooks';

interface MoveNavigationProps {
  canStepBack: boolean;
  canStepForward: boolean;
  nextCriticalPly: number | undefined;
  onStep: (delta: number) => void;
  onSelectPly: (ply: number) => void;
}

export const MoveNavigation: React.FC<MoveNavigationProps> = ({
  canStepBack,
  canStepForward,
  nextCriticalPly,
  onStep,
  onSelectPly,
}) => {
  const { t } = useAnalysisTranslation();

  return (
    <div className='flex items-center justify-between gap-2'>
      <StepControls
        canStepBack={canStepBack}
        canStepForward={canStepForward}
        onStep={onStep}
      />
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
    </div>
  );
};
