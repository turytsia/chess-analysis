import { BookOpen, GraduationCap, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Board } from '../../components/Board';
import { BoardLayout } from '../../components/BoardLayout';
import { EngineLines } from '../../components/EngineLines';
import { EvalBar } from '../../components/EvalBar';
import { MoveLine } from '../../components/MoveLine';
import { MoveVerdict } from '../../components/MoveVerdict';
import { StepControls } from '../../components/StepControls';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { getLinePositions, getSideToMove } from '../../services/notation';
import {
  countLines,
  followSequence,
  getNodeName,
  type Opening,
  type OpeningBook,
  type OpeningNode,
} from '../../services/openings';
import { createMove } from '../../services/pgn';
import { useTrainerTranslation } from '../../translations/hooks';
import { toBestMoveArrows } from '../../utilities/boardArrows';
import { formatEval, formatMoveNumber } from '../../utilities/format';
import { useStepKeys } from '../../utilities/useStepKeys';
import {
  EMPTY_LINE,
  getShownMoves,
  openLine,
  playSan,
  selectCursor,
  stepLine,
  type BrowseLine,
} from './browseLine';
import { useLineAnalysis } from './useLineAnalysis';

const BOARD_ID = 'browse-board';
const MAX_SEARCH_RESULTS = 8;
const TRAINEE_COLOR = 'black';

interface BrowseModeProps {
  book: OpeningBook;
  line: BrowseLine;
  onLineChange: (line: BrowseLine) => void;
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
  line,
  onLineChange,
  onPractice,
}) => {
  const { t } = useTrainerTranslation();
  const path = useMemo(() => getShownMoves(line), [line]);
  const positions = useMemo(() => getLinePositions(line.moves), [line.moves]);
  const fen = positions[line.cursor];
  const {
    shownMove,
    label: shownLabel,
    evaluation,
    hasFailed: hasEngineFailed,
  } = useLineAnalysis({
    line,
    positions,
    bookLength: followSequence(book.root, line.moves).length,
  });
  const nodes = followSequence(book.root, path);
  const isInBook = nodes.length === path.length;
  const node = isInBook ? nodes[nodes.length - 1] ?? book.root : undefined;
  const lineToPractice = node?.opening;
  const opening = nodes.reduce<Opening | undefined>(
    (deepest, current) => current.opening ?? deepest,
    undefined
  );

  useStepKeys({ onStep: (delta) => onLineChange(stepLine(line, delta)) });

  const handleMove = (from: string, to: string): boolean => {
    const move = createMove(fen, from, to, path.length + 1);
    if (move) {
      onLineChange(playSan(line, move.san));
    }
    return move !== undefined;
  };

  return (
    <BoardLayout
      evalBar={
        <EvalBar
          evaluation={evaluation}
          orientation={TRAINEE_COLOR}
          isPending={!hasEngineFailed}
        />
      }
      board={
        <Board
          id={BOARD_ID}
          fen={fen}
          orientation={TRAINEE_COLOR}
          arrows={toBestMoveArrows(evaluation)}
          movableColor={getSideToMove(fen)}
          onMove={handleMove}
        />
      }
      controls={
        <StepControls
          canStepBack={line.cursor > 0}
          canStepForward={line.cursor < line.moves.length}
          onStep={(delta) => onLineChange(stepLine(line, delta))}
        />
      }
    >
      <Card className='shrink-0'>
        <CardContent className='flex flex-col gap-3 p-3'>
          <div className='flex flex-col gap-1.5'>
            <div className='flex flex-wrap items-center gap-2'>
              {opening && (
                <Badge variant='outline' className='font-mono'>
                  {opening.eco}
                </Badge>
              )}
              <h2 className='text-base font-semibold'>
                {opening?.name ?? t('StartingPosition')}
              </h2>
              {!isInBook && <Badge variant='muted'>{t('OutOfBook')}</Badge>}
            </div>
            {line.moves.length > 0 ? (
              <MoveLine
                aria-label={t('LineMoves')}
                sans={line.moves}
                firstPly={1}
                cursor={line.cursor}
                onSelectCursor={(cursor) =>
                  onLineChange(selectCursor(line, cursor))
                }
              />
            ) : (
              <p className='font-mono text-xs text-muted-foreground'>
                {t('NoMovesYet')}
              </p>
            )}
          </div>
          {shownMove && (
            <MoveVerdict
              move={shownMove}
              label={shownLabel}
              isPending={!hasEngineFailed}
            />
          )}
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={line.moves.length === 0}
              onClick={() => onLineChange(EMPTY_LINE)}
            >
              <RotateCcw />
              {t('Reset')}
            </Button>
            {!isInBook && (
              <Button
                size='sm'
                onClick={() => onLineChange(selectCursor(line, nodes.length))}
              >
                <BookOpen />
                {t('BackToBook')}
              </Button>
            )}
            {lineToPractice && (
              <Button size='sm' onClick={() => onPractice([lineToPractice])}>
                <GraduationCap />
                {t('PracticeThisLine')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className='shrink-0'>
        <CardContent className='flex flex-col gap-3 p-3'>
          <div className='flex items-center justify-between gap-3'>
            <h3 className='text-sm font-medium'>{t('Engine')}</h3>
            <span className='font-mono text-sm font-medium tabular-nums'>
              {formatEval(evaluation)}
            </span>
          </div>
          <EngineLines
            fen={fen}
            ply={path.length}
            evaluation={evaluation}
            hasFailed={hasEngineFailed}
          />
        </CardContent>
      </Card>
      <Card className='lg:flex lg:min-h-28 lg:flex-1 lg:flex-col'>
        <CardContent className='flex flex-col gap-3 p-3 lg:min-h-0 lg:flex-1'>
          <h3 className='text-sm font-medium'>{t('Continuations')}</h3>
          {node ? (
            <ContinuationList
              node={node}
              onSelect={(san) => onLineChange(playSan(line, san))}
            />
          ) : (
            <p className='text-sm text-muted-foreground'>
              {t('NoTheoryFromHere')}
            </p>
          )}
        </CardContent>
      </Card>
      <Card className='shrink-0'>
        <CardContent className='p-3'>
          <LineSearch
            openings={book.openings}
            onSelect={(selected) => onLineChange(openLine(selected.moves))}
          />
        </CardContent>
      </Card>
    </BoardLayout>
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
    <ul className='flex max-h-80 flex-col gap-1 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1'>
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
