import { Trans } from 'react-i18next';

import type { MoveAssessment } from '../../services/classify';
import type { PositionEval } from '../../services/evaluation';
import { toSanLine } from '../../services/notation';
import type { GameMove } from '../../services/pgn';
import { useAnalysisTranslation } from '../../translations/hooks';
import {
  formatEval,
  formatMoveLine,
  formatMoveNumber,
} from '../../utilities/format';
import { MoveLabelIcon } from './MoveLabelIcon';
import { useLocalizeMoveLabel } from './useLocalizeMoveLabel';

const ENGINE_LINE_PLIES = 8;

interface MoveInsightProps {
  fen: string;
  ply: number;
  move: GameMove | undefined;
  assessment: MoveAssessment | undefined;
  evaluation: PositionEval | undefined;
  previousEvaluation: PositionEval | undefined;
}

interface EngineLinesProps {
  fen: string;
  ply: number;
  evaluation: PositionEval;
}

export const MoveInsight: React.FC<MoveInsightProps> = ({
  fen,
  ply,
  move,
  assessment,
  evaluation,
  previousEvaluation,
}) => {
  const { t } = useAnalysisTranslation();
  const localizeLabel = useLocalizeMoveLabel();
  const bestUci = previousEvaluation?.lines[0]?.pv[0];
  const [bestSan] =
    move && bestUci && assessment && !assessment.isBest
      ? toSanLine(move.fenBefore, [bestUci], 1)
      : [];

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
          {bestSan && (
            <p className='text-sm text-muted-foreground'>
              <Trans
                t={t}
                i18nKey='BestMoveWas'
                values={{ move: bestSan }}
                components={{
                  move: <strong className='font-medium text-foreground' />,
                }}
              />
            </p>
          )}
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
      {evaluation && evaluation.lines.length > 0 && (
        <EngineLines fen={fen} ply={ply} evaluation={evaluation} />
      )}
    </div>
  );
};

const EngineLines: React.FC<EngineLinesProps> = ({ fen, ply, evaluation }) => {
  const { t } = useAnalysisTranslation();

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
