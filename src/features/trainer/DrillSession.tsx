import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../components/ui/Button';
import { listLineProgress, saveLineProgress } from '../../services/db';
import { reviewLine } from '../../services/leitner';
import type { Opening, OpeningBook } from '../../services/openings';
import { useTrainerTranslation } from '../../translations/hooks';
import { LineDrill } from './LineDrill';

interface DrillSessionProps {
  queue: Array<Opening>;
  book: OpeningBook;
  onFinish: () => void;
}

export const DrillSession: React.FC<DrillSessionProps> = ({
  queue,
  book,
  onFinish,
}) => {
  const { t } = useTrainerTranslation();
  const progress = useLiveQuery(listLineProgress);
  const [lineIndex, setLineIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<Array<boolean>>([]);
  const line = queue[lineIndex];
  const isLineDone = results.length > lineIndex;
  const isLastLine = lineIndex === queue.length - 1;

  const handleComplete = (isSuccess: boolean): void => {
    const previous = progress?.find(({ lineId }) => lineId === line.id);
    saveLineProgress(reviewLine(previous, line.id, isSuccess, Date.now()));
    setResults([...results.slice(0, lineIndex), isSuccess]);
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-2'>
        <p className='text-sm text-muted-foreground'>
          {t('SessionProgress', {
            current: lineIndex + 1,
            total: queue.length,
            clean: results.filter(Boolean).length,
          })}
        </p>
        <Button variant='ghost' size='sm' onClick={onFinish}>
          <X />
          {t('EndSession')}
        </Button>
      </div>
      <LineDrill
        key={`${line.id}:${attempt}`}
        line={line}
        book={book}
        onComplete={handleComplete}
      >
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            setResults(results.slice(0, lineIndex));
            setAttempt(attempt + 1);
          }}
        >
          <RotateCcw />
          {t('RestartLine')}
        </Button>
        {isLineDone && !isLastLine && (
          <Button size='sm' onClick={() => setLineIndex(lineIndex + 1)}>
            {t('NextLine')}
            <ArrowRight />
          </Button>
        )}
        {isLineDone && isLastLine && (
          <Button size='sm' onClick={onFinish}>
            {t('FinishSession')}
          </Button>
        )}
      </LineDrill>
    </div>
  );
};
