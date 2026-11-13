import { useTranslation } from 'react-i18next';

import type { MoveLabel } from '../services/classify';
import type { GameMove } from '../services/pgn';
import { formatMoveNumber } from '../utilities/format';
import { useLocalizeMoveLabel } from '../utilities/useLocalizeMoveLabel';
import { MoveLabelIcon } from './MoveLabelIcon';

interface MoveVerdictProps {
  move: GameMove;
  label: MoveLabel | undefined;
  isPending: boolean;
}

export const MoveVerdict: React.FC<MoveVerdictProps> = ({
  move,
  label,
  isPending,
}) => {
  const { t } = useTranslation();
  const localizeLabel = useLocalizeMoveLabel();

  return (
    <div className='flex min-w-0 items-center gap-2'>
      {label && <MoveLabelIcon label={label} className='size-5' />}
      <span className='truncate text-base font-semibold'>
        {formatMoveNumber(move.ply)} {move.san}
      </span>
      {label && (
        <span className='text-sm text-muted-foreground'>
          {localizeLabel(label)}
        </span>
      )}
      {!label && isPending && (
        <span className='text-sm text-muted-foreground'>
          {t('JudgingMove')}
        </span>
      )}
    </div>
  );
};
