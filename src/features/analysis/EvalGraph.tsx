import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotItemDotProps,
} from 'recharts';

import { MoveLabel, type MoveAssessment } from '../../services/classify';
import { whiteWinPercent, type PositionEval } from '../../services/evaluation';
import type { GameMove } from '../../services/pgn';
import { useAnalysisTranslation } from '../../translations/hooks';
import { cn } from '../../utilities/cn';
import { formatEval, formatMoveNumber } from '../../utilities/format';
import { MoveLabelIcon } from './MoveLabelIcon';
import { useLocalizeMoveLabel } from './useLocalizeMoveLabel';

const CHART_HEIGHT = 120;
const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 8 } as const;
const WIN_DOMAIN = [0, 100] as const;
const EVEN_CHANCES = 50;
const MARKER_RADIUS = 4;
const MARKERS: Partial<Record<MoveLabel, MarkerKind>> = {
  [MoveLabel.Blunder]: 'blunder',
  [MoveLabel.Mistake]: 'mistake',
  [MoveLabel.Miss]: 'mistake',
  [MoveLabel.Brilliant]: 'highlight',
  [MoveLabel.Great]: 'highlight',
};
const MARKER_CLASS_NAMES: Record<MarkerKind, string> = {
  blunder: 'fill-label-blunder stroke-card',
  mistake: 'fill-card stroke-label-mistake',
  highlight: 'fill-label-great stroke-card',
};

type MarkerKind = 'blunder' | 'mistake' | 'highlight';

interface GraphPoint {
  ply: number;
  win: number | undefined;
  evalText: string;
  move: GameMove | undefined;
  label: MoveLabel | undefined;
}

interface EvalGraphProps {
  moves: Array<GameMove>;
  evals: Array<PositionEval>;
  assessments: Array<MoveAssessment | undefined>;
  ply: number;
  onSelectPly: (ply: number) => void;
}

interface MarkerDotProps {
  cx: number | undefined;
  cy: number | undefined;
  label: MoveLabel | undefined;
}

interface GraphTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: GraphPoint }>;
}

interface MarkerLegendItemProps {
  kind: MarkerKind;
  children: React.ReactNode;
}

export const EvalGraph: React.FC<EvalGraphProps> = ({
  moves,
  evals,
  assessments,
  ply,
  onSelectPly,
}) => {
  const { t } = useAnalysisTranslation();
  const points = Array.from(
    { length: moves.length + 1 },
    (_, index): GraphPoint => {
      const evaluation = evals[index];
      return {
        ply: index,
        win: evaluation && whiteWinPercent(evaluation),
        evalText: formatEval(evaluation),
        move: moves[index - 1],
        label: assessments[index - 1]?.label,
      };
    }
  );

  return (
    <figure className='flex flex-col gap-2'>
      <figcaption className='flex items-baseline justify-between gap-2'>
        <span className='text-sm font-medium'>{t('WhiteWinChance')}</span>
        <span className='text-xs text-muted-foreground'>
          {t('WinChanceGraphHint')}
        </span>
      </figcaption>
      <ResponsiveContainer width='100%' height={CHART_HEIGHT}>
        <AreaChart
          data={points}
          margin={CHART_MARGIN}
          className='cursor-pointer'
          onClick={({ activeTooltipIndex }) => {
            const selected = Number(activeTooltipIndex);
            activeTooltipIndex != null &&
              Number.isInteger(selected) &&
              onSelectPly(selected);
          }}
        >
          <CartesianGrid vertical={false} stroke='var(--border)' />
          <XAxis
            dataKey='ply'
            type='number'
            domain={[0, Math.max(moves.length, 1)]}
            tickFormatter={(value: number) => String(Math.ceil(value / 2))}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis domain={WIN_DOMAIN} ticks={[0, EVEN_CHANCES, 100]} hide />
          <ReferenceLine y={EVEN_CHANCES} stroke='var(--ring)' />
          <ReferenceLine x={ply} stroke='var(--foreground)' strokeWidth={1} />
          <Tooltip
            content={<GraphTooltip />}
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
            isAnimationActive={false}
          />
          <Area
            dataKey='win'
            type='monotone'
            stroke='var(--foreground)'
            strokeWidth={2}
            strokeLinejoin='round'
            strokeLinecap='round'
            fill='var(--foreground)'
            fillOpacity={0.1}
            dot={renderMarkerDot}
            activeDot={{
              r: MARKER_RADIUS,
              stroke: 'var(--card)',
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <ul className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
        <MarkerLegendItem kind='blunder'>{t('Blunder')}</MarkerLegendItem>
        <MarkerLegendItem kind='mistake'>{t('MistakeOrMiss')}</MarkerLegendItem>
        <MarkerLegendItem kind='highlight'>
          {t('BrilliantOrGreat')}
        </MarkerLegendItem>
      </ul>
    </figure>
  );
};

const MarkerDot: React.FC<MarkerDotProps> = ({ cx, cy, label }) => {
  const kind = label && MARKERS[label];
  if (!kind || cx === undefined || cy === undefined) {
    return null;
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={MARKER_RADIUS}
      strokeWidth={2}
      className={MARKER_CLASS_NAMES[kind]}
    />
  );
};

const GraphTooltip: React.FC<GraphTooltipProps> = ({ active, payload }) => {
  const { t } = useAnalysisTranslation();
  const localizeLabel = useLocalizeMoveLabel();
  const point = payload?.[0]?.payload;
  if (!active || !point) {
    return null;
  }

  return (
    <div className='flex flex-col gap-1 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md'>
      <span className='font-mono text-sm font-semibold tabular-nums'>
        {point.evalText}
      </span>
      <span className='text-muted-foreground'>
        {point.move
          ? `${formatMoveNumber(point.move.ply)} ${point.move.san}`
          : t('StartingPosition')}
      </span>
      {point.label && (
        <span className='flex items-center gap-1.5 text-muted-foreground'>
          <MoveLabelIcon label={point.label} />
          {localizeLabel(point.label)}
        </span>
      )}
    </div>
  );
};

const MarkerLegendItem: React.FC<MarkerLegendItemProps> = ({
  kind,
  children,
}) => (
  <li className='flex items-center gap-1.5'>
    <svg viewBox='0 0 12 12' aria-hidden className='size-3'>
      <circle
        cx={6}
        cy={6}
        r={MARKER_RADIUS}
        strokeWidth={2}
        className={cn(MARKER_CLASS_NAMES[kind])}
      />
    </svg>
    {children}
  </li>
);

function renderMarkerDot({
  cx,
  cy,
  index,
  payload,
}: DotItemDotProps): React.ReactNode {
  const point: GraphPoint = payload;
  return <MarkerDot key={index} cx={cx} cy={cy} label={point.label} />;
}
