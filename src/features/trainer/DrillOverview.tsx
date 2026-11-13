import { useLiveQuery } from 'dexie-react-hooks';
import { GraduationCap, Play } from 'lucide-react';
import { useState } from 'react';

import { RelativeDate } from '../../components/RelativeDate';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { listLineProgress } from '../../services/db';
import {
  buildReviewQueue,
  isDue,
  LEITNER_BOX_COUNT,
  type LineProgress,
} from '../../services/leitner';
import type { Opening, OpeningBook } from '../../services/openings';
import { useTrainerTranslation } from '../../translations/hooks';
import { formatMoveLine } from '../../utilities/format';

const NEW_LINES_PER_SESSION = 5;

interface DrillOverviewProps {
  book: OpeningBook;
  onStart: (lines: Array<Opening>) => void;
}

interface StatTileProps {
  label: string;
  value: number;
}

interface LineRowProps {
  line: Opening;
  progress: LineProgress | undefined;
  now: number;
  onPractice: () => void;
}

export const DrillOverview: React.FC<DrillOverviewProps> = ({
  book,
  onStart,
}) => {
  const { t } = useTrainerTranslation();
  const [now] = useState(() => Date.now());
  const progress = useLiveQuery(listLineProgress);

  if (!progress) {
    return null;
  }
  const progressByLine = new Map(
    progress.map((entry) => [entry.lineId, entry])
  );
  const known = book.openings.flatMap(
    (line) => progressByLine.get(line.id) ?? []
  );
  const queue = buildReviewQueue({
    lines: book.openings,
    progressByLine,
    now,
    newLineLimit: NEW_LINES_PER_SESSION,
  });

  return (
    <div className='flex flex-col gap-6'>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        <StatTile
          label={t('DueNow')}
          value={known.filter((entry) => isDue(entry, now)).length}
        />
        <StatTile
          label={t('NewLines')}
          value={book.openings.length - known.length}
        />
        <StatTile
          label={t('Learning')}
          value={known.filter(({ box }) => box < LEITNER_BOX_COUNT).length}
        />
        <StatTile
          label={t('Mastered')}
          value={known.filter(({ box }) => box === LEITNER_BOX_COUNT).length}
        />
      </div>
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4'>
        <div className='flex flex-col gap-1'>
          <h2 className='text-sm font-medium'>{t('ReviewSession')}</h2>
          <p className='text-sm text-muted-foreground'>
            {queue.length > 0
              ? t('ReviewSessionDescription', { count: queue.length })
              : t('NothingToReview')}
          </p>
        </div>
        <Button disabled={queue.length === 0} onClick={() => onStart(queue)}>
          <Play />
          {t('StartSession')}
        </Button>
      </div>
      <Card className='overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead>{t('Line')}</TableHead>
              <TableHead>{t('Moves')}</TableHead>
              <TableHead>{t('Level')}</TableHead>
              <TableHead>{t('NextReview')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {book.openings.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                progress={progressByLine.get(line.id)}
                now={now}
                onPractice={() => onStart([line])}
              />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

const StatTile: React.FC<StatTileProps> = ({ label, value }) => (
  <div className='flex flex-col gap-1 rounded-lg border bg-card p-4'>
    <span className='text-xs text-muted-foreground'>{label}</span>
    <span className='text-2xl leading-none font-semibold'>{value}</span>
  </div>
);

const LineRow: React.FC<LineRowProps> = ({
  line,
  progress,
  now,
  onPractice,
}) => {
  const { t } = useTrainerTranslation();

  return (
    <TableRow>
      <TableCell className='max-w-80'>
        <div className='flex items-center gap-2'>
          <span className='font-mono text-xs text-muted-foreground'>
            {line.eco}
          </span>
          <span className='truncate'>{line.name}</span>
        </div>
      </TableCell>
      <TableCell className='max-w-64 truncate font-mono text-xs text-muted-foreground'>
        {formatMoveLine(line.moves, 1)}
      </TableCell>
      <TableCell>
        {progress ? (
          <Badge variant='secondary'>
            {t('LevelOfTotal', {
              level: progress.box,
              total: LEITNER_BOX_COUNT,
            })}
          </Badge>
        ) : (
          <Badge variant='muted'>{t('New')}</Badge>
        )}
      </TableCell>
      <TableCell className='text-muted-foreground'>
        {progress && isDue(progress, now) && t('DueNow')}
        {progress && !isDue(progress, now) && (
          <RelativeDate timestamp={progress.dueAt} />
        )}
      </TableCell>
      <TableCell className='text-right'>
        <Button variant='ghost' size='sm' onClick={onPractice}>
          <GraduationCap />
          {t('Practice')}
        </Button>
      </TableCell>
    </TableRow>
  );
};
