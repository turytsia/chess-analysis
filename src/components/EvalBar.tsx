import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  whiteWinPercent,
  type PlayerColor,
  type PositionEval,
} from '../services/evaluation';
import { cn } from '../utilities/cn';
import { formatEval } from '../utilities/format';

const NEUTRAL_PERCENT = 50;
const LABEL_DIGITS = 1;

interface EvalBarProps {
  evaluation: PositionEval | undefined;
  orientation: PlayerColor;
  isPending?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  evaluation,
  orientation,
  isPending = false,
}) => {
  const { t } = useTranslation();
  const [lastEvaluation, setLastEvaluation] = useState(evaluation);
  if (evaluation && evaluation !== lastEvaluation) {
    setLastEvaluation(evaluation);
  }
  const shown = evaluation ?? (isPending ? lastEvaluation : undefined);
  const whitePercent = shown ? whiteWinPercent(shown) : NEUTRAL_PERCENT;
  const isWhiteAhead = whitePercent >= NEUTRAL_PERCENT;
  const isLabelAtBottom = isWhiteAhead === (orientation === 'white');

  return (
    <div
      role='meter'
      aria-label={t('WhiteWinChance')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(whitePercent)}
      className='relative w-8 shrink-0 overflow-hidden rounded-md border bg-eval-black'
    >
      <div
        className={cn(
          'absolute inset-x-0 bg-eval-white transition-[height] duration-300',
          orientation === 'white' ? 'bottom-0' : 'top-0'
        )}
        style={{ height: `${whitePercent}%` }}
      />
      <span
        className={cn(
          'absolute inset-x-0 text-center font-mono text-[9px] font-medium',
          isLabelAtBottom ? 'bottom-1' : 'top-1',
          isWhiteAhead ? 'text-eval-black' : 'text-eval-white'
        )}
      >
        {formatEval(shown, LABEL_DIGITS)}
      </span>
    </div>
  );
};
