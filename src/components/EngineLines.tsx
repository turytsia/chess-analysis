import { useTranslation } from 'react-i18next';

import type { PositionEval } from '../services/evaluation';
import { toSanLine } from '../services/notation';
import { formatEval, formatMoveLine } from '../utilities/format';

const ENGINE_LINE_PLIES = 8;

interface EngineLinesProps {
  fen: string;
  ply: number;
  evaluation: PositionEval | undefined;
  hasFailed?: boolean;
}

export const EngineLines: React.FC<EngineLinesProps> = ({
  fen,
  ply,
  evaluation,
  hasFailed = false,
}) => {
  const { t } = useTranslation();

  if (!evaluation && hasFailed) {
    return (
      <p role='alert' className='text-xs text-destructive'>
        {t('EngineFailed')}
      </p>
    );
  }
  if (!evaluation) {
    return (
      <p className='text-xs text-muted-foreground'>{t('EngineThinking')}</p>
    );
  }
  if (evaluation.lines.length === 0) {
    return null;
  }

  return (
    <ul aria-label={t('EngineLines')} className='flex flex-col gap-1'>
      {evaluation.lines.map((line, index) => (
        <li
          key={index}
          className='flex items-baseline gap-2 text-xs text-muted-foreground'
        >
          <span className='w-11 shrink-0 rounded-sm bg-muted px-1 py-0.5 text-center font-mono font-medium text-foreground tabular-nums'>
            {formatEval({ lines: [line] })}
          </span>
          <span className='truncate font-mono'>
            {formatMoveLine(
              toSanLine(fen, line.pv, ENGINE_LINE_PLIES),
              ply + 1
            )}
          </span>
        </li>
      ))}
    </ul>
  );
};
