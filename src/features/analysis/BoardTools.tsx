import { FlipVertical2, Lightbulb } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Tooltip } from '../../components/ui/Tooltip';
import { useAnalysisTranslation } from '../../translations/hooks';

interface BoardToolsProps {
  isBestMoveShown: boolean;
  onToggleBestMove: () => void;
  onFlipBoard: () => void;
}

export const BoardTools: React.FC<BoardToolsProps> = ({
  isBestMoveShown,
  onToggleBestMove,
  onFlipBoard,
}) => {
  const { t } = useAnalysisTranslation();

  return (
    <>
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
    </>
  );
};
