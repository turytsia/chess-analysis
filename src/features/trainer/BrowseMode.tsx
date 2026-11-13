import { ArrowLeft, GraduationCap, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Board } from '../../components/Board';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { getLinePositions, resolveMove } from '../../services/notation';
import {
  countLines,
  followSequence,
  getNodeName,
  type Opening,
  type OpeningBook,
  type OpeningNode,
} from '../../services/openings';
import { useTrainerTranslation } from '../../translations/hooks';
import { formatMoveLine, formatMoveNumber } from '../../utilities/format';

const BOARD_ID = 'browse-board';
const MAX_SEARCH_RESULTS = 8;
const TRAINEE_COLOR = 'black';

interface BrowseModeProps {
  book: OpeningBook;
  path: Array<string>;
  onPathChange: (path: Array<string>) => void;
  onPractice: (lines: Array<Opening>) => void;
}

interface ContinuationListProps {
  node: OpeningNode;
  onSelect: (san: string) => void;
}

interface LineSearchProps {
  openings: Array<Opening>;
  onSelect: (opening: Opening) => void;
}

export const BrowseMode: React.FC<BrowseModeProps> = ({
  book,
  path,
  onPathChange,
  onPractice,
}) => {
  const { t } = useTrainerTranslation();
  const [rejectedSan, setRejectedSan] = useState<string | undefined>();
  const positions = useMemo(() => getLinePositions(path), [path]);
  const nodes = followSequence(book.root, path);
  const node = nodes[nodes.length - 1] ?? book.root;
  const fen = positions[positions.length - 1];
  const opening = nodes.reduce<Opening | undefined>(
    (deepest, current) => current.opening ?? deepest,
    undefined
  );

  const selectPath = (next: Array<string>): void => {
    setRejectedSan(undefined);
    onPathChange(next);
  };

  const handleMove = (from: string, to: string): boolean => {
    const move = resolveMove(fen, from, to);
    if (!move) {
      return false;
    }
    if (!node.children.has(move.san)) {
      setRejectedSan(move.san);
      return false;
    }
    selectPath([...path, move.san]);
    return true;
  };

  return (
    <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]'>
      <div className='mx-auto flex w-full max-w-[38rem] flex-col gap-3'>
        <Board
          id={BOARD_ID}
          fen={fen}
          orientation={TRAINEE_COLOR}
          movableColor={path.length % 2 === 0 ? 'white' : 'black'}
          onMove={handleMove}
        />
        <p className='min-h-5 text-sm text-muted-foreground' role='status'>
          {rejectedSan
            ? t('MoveNotInBook', { move: rejectedSan })
            : t('BrowseBoardHint')}
        </p>
      </div>
      <div className='flex flex-col gap-4'>
        <Card>
          <CardContent className='flex flex-col gap-3'>
            <div className='flex flex-col gap-1.5'>
              <div className='flex items-center gap-2'>
                {opening && (
                  <Badge variant='outline' className='font-mono'>
                    {opening.eco}
                  </Badge>
                )}
                <h2 className='text-base font-semibold'>
                  {opening?.name ?? t('StartingPosition')}
                </h2>
              </div>
              <p className='font-mono text-xs text-muted-foreground'>
                {path.length > 0 ? formatMoveLine(path, 1) : t('NoMovesYet')}
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={path.length === 0}
                onClick={() => selectPath(path.slice(0, -1))}
              >
                <ArrowLeft />
                {t('Back')}
              </Button>
              <Button
                variant='outline'
                size='sm'
                disabled={path.length === 0}
                onClick={() => selectPath([])}
              >
                <RotateCcw />
                {t('Reset')}
              </Button>
              {node.opening && (
                <Button
                  size='sm'
                  onClick={() => node.opening && onPractice([node.opening])}
                >
                  <GraduationCap />
                  {t('PracticeThisLine')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex flex-col gap-3'>
            <h3 className='text-sm font-medium'>{t('Continuations')}</h3>
            <ContinuationList
              node={node}
              onSelect={(san) => selectPath([...path, san])}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <LineSearch
              openings={book.openings}
              onSelect={(selected) => selectPath(selected.moves)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ContinuationList: React.FC<ContinuationListProps> = ({
  node,
  onSelect,
}) => {
  const { t } = useTrainerTranslation();
  const continuations = [...node.children.values()]
    .map((child) => ({
      child,
      lineCount: countLines(child),
      name: getNodeName(child),
    }))
    .sort((a, b) => b.lineCount - a.lineCount);

  if (continuations.length === 0) {
    return <p className='text-sm text-muted-foreground'>{t('EndOfLine')}</p>;
  }

  return (
    <ul className='flex max-h-80 flex-col gap-1 overflow-y-auto'>
      {continuations.map(({ child, lineCount, name }) => (
        <li key={child.san}>
          <button
            type='button'
            onClick={() => onSelect(child.san)}
            className='flex w-full cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50'
          >
            <span className='w-16 shrink-0 font-mono font-medium'>
              {formatMoveNumber(child.ply)} {child.san}
            </span>
            <span className='min-w-0 flex-1 truncate text-muted-foreground'>
              {name}
            </span>
            <span className='shrink-0 font-mono text-xs text-muted-foreground tabular-nums'>
              {t('LinesWithCount', { count: lineCount })}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

const LineSearch: React.FC<LineSearchProps> = ({ openings, onSelect }) => {
  const { t } = useTrainerTranslation();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const results =
    normalized.length === 0
      ? []
      : openings
          .filter(({ name, eco }) =>
            `${eco} ${name}`.toLowerCase().includes(normalized)
          )
          .slice(0, MAX_SEARCH_RESULTS);

  return (
    <div className='flex flex-col gap-3'>
      <div className='relative'>
        <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          type='search'
          value={query}
          placeholder={t('SearchLinesPlaceholder')}
          aria-label={t('SearchLines')}
          className='pl-9'
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {results.length > 0 && (
        <ul className='flex flex-col gap-1'>
          {results.map((opening) => (
            <li key={opening.id}>
              <button
                type='button'
                onClick={() => {
                  onSelect(opening);
                  setQuery('');
                }}
                className='flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50'
              >
                <span className='font-mono text-xs text-muted-foreground'>
                  {opening.eco}
                </span>
                <span className='truncate'>{opening.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {normalized.length > 0 && results.length === 0 && (
        <p className='text-sm text-muted-foreground'>{t('NoLinesFound')}</p>
      )}
    </div>
  );
};
