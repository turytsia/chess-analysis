import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import type { GameReport } from '../../services/classify';
import type { StoredGame } from '../../services/db';
import { GamePhase } from '../../services/material';
import { useAnalysisTranslation } from '../../translations/hooks';
import { formatPercent } from '../../utilities/format';
import { MoveLabelIcon } from './MoveLabelIcon';
import { useLocalizeMoveLabel } from './useLocalizeMoveLabel';

const NO_VALUE = '–';

interface ReportPanelProps {
  game: StoredGame;
  report: GameReport;
}

interface AccuracyTileProps {
  label: string;
  player: string;
  accuracy: number | undefined;
}

export const ReportPanel: React.FC<ReportPanelProps> = ({ game, report }) => {
  const { t } = useAnalysisTranslation();
  const localizeLabel = useLocalizeMoveLabel();
  const localizePhase = (phase: GamePhase): string =>
    ({
      [GamePhase.Opening]: t('Opening'),
      [GamePhase.Middlegame]: t('Middlegame'),
      [GamePhase.Endgame]: t('Endgame'),
    }[phase]);

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-2 gap-3'>
        <AccuracyTile
          label={t('WhiteAccuracy')}
          player={game.white.name}
          accuracy={report.accuracy?.white}
        />
        <AccuracyTile
          label={t('BlackAccuracy')}
          player={game.black.name}
          accuracy={report.accuracy?.black}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow className='hover:bg-transparent'>
            <TableHead className='pl-0'>{t('MoveQuality')}</TableHead>
            <TableHead className='text-right'>{t('White')}</TableHead>
            <TableHead className='pr-0 text-right'>{t('Black')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.counts.map(({ label, count }) => (
            <TableRow key={label} className='hover:bg-transparent'>
              <TableCell className='py-1.5 pl-0'>
                <span className='flex items-center gap-2'>
                  <MoveLabelIcon label={label} />
                  {localizeLabel(label)}
                </span>
              </TableCell>
              <TableCell className='py-1.5 text-right font-mono tabular-nums'>
                {count.white}
              </TableCell>
              <TableCell className='py-1.5 pr-0 text-right font-mono tabular-nums'>
                {count.black}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Table>
        <TableHeader>
          <TableRow className='hover:bg-transparent'>
            <TableHead className='pl-0'>{t('AccuracyByPhase')}</TableHead>
            <TableHead className='text-right'>{t('White')}</TableHead>
            <TableHead className='pr-0 text-right'>{t('Black')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.phases.map(({ phase, accuracy }) => (
            <TableRow key={phase} className='hover:bg-transparent'>
              <TableCell className='py-1.5 pl-0'>
                {localizePhase(phase)}
              </TableCell>
              <TableCell className='py-1.5 text-right font-mono tabular-nums'>
                {toPercentText(accuracy.white)}
              </TableCell>
              <TableCell className='py-1.5 pr-0 text-right font-mono tabular-nums'>
                {toPercentText(accuracy.black)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const AccuracyTile: React.FC<AccuracyTileProps> = ({
  label,
  player,
  accuracy,
}) => (
  <div className='flex flex-col gap-1 rounded-lg border p-3'>
    <span className='text-xs text-muted-foreground'>{label}</span>
    <span className='text-2xl leading-none font-semibold'>
      {toPercentText(accuracy)}
    </span>
    <span className='truncate text-xs text-muted-foreground'>{player}</span>
  </div>
);

function toPercentText(value: number | undefined): string {
  return value === undefined ? NO_VALUE : formatPercent(value);
}
