import { CircleCheck, CircleX, Lightbulb } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Board, type BoardArrow } from '../../components/Board';
import { BoardLayout } from '../../components/BoardLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Progress } from '../../components/ui/Progress';
import { getLinePositions, getMoveSquares } from '../../services/notation';
import {
  followSequence,
  getNodeName,
  type Opening,
  type OpeningBook,
} from '../../services/openings';
import { createMove } from '../../services/pgn';
import { useTrainerTranslation } from '../../translations/hooks';
import { formatMoveLine } from '../../utilities/format';

const BOARD_ID = 'drill-board';
const TRAINEE_COLOR = 'black';
const REPLY_DELAY_MS = 450;
const MISTAKES_BEFORE_HINT = 2;
const HINT_ARROW_COLOR = 'var(--label-great)';

type Feedback =
  | { kind: 'wrong'; san: string }
  | { kind: 'otherLine'; san: string; name: string }
  | undefined;

interface LineDrillProps {
  line: Opening;
  book: OpeningBook;
  onComplete: (isSuccess: boolean) => void;
  children: React.ReactNode;
}

interface DrillStatusProps {
  isFinished: boolean;
  isClean: boolean;
  isTraineeTurn: boolean;
  feedback: Feedback;
}

export const LineDrill: React.FC<LineDrillProps> = ({
  line,
  book,
  onComplete,
  children,
}) => {
  const { t } = useTrainerTranslation();
  const [playedPlies, setPlayedPlies] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [mistakesOnMove, setMistakesOnMove] = useState(0);
  const [isHintRequested, setIsHintRequested] = useState(false);
  const [hasUsedHint, setHasUsedHint] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();
  const positions = useMemo(() => getLinePositions(line.moves), [line.moves]);

  const totalPlies = line.moves.length;
  const isFinished = playedPlies >= totalPlies;
  const isTraineeTurn = !isFinished && playedPlies % 2 === 1;
  const isHintShown =
    isTraineeTurn &&
    (isHintRequested || mistakesOnMove >= MISTAKES_BEFORE_HINT);
  const fen = positions[playedPlies];
  const expectedSan = line.moves[playedPlies];

  useEffect(() => {
    if (isFinished || isTraineeTurn) {
      return;
    }
    const timer = window.setTimeout(
      () => setPlayedPlies((plies) => plies + 1),
      REPLY_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [isFinished, isTraineeTurn, playedPlies]);

  const handleMove = (from: string, to: string): boolean => {
    const move = isTraineeTurn
      ? createMove(fen, from, to, playedPlies + 1)
      : undefined;
    if (!move) {
      return false;
    }
    if (move.san !== expectedSan) {
      const [node] = followSequence(book.root, [
        ...line.moves.slice(0, playedPlies),
        move.san,
      ]).slice(playedPlies);
      const otherLineName = node && getNodeName(node);
      setMistakes(mistakes + 1);
      setMistakesOnMove(mistakesOnMove + 1);
      setFeedback(
        otherLineName
          ? { kind: 'otherLine', san: move.san, name: otherLineName }
          : { kind: 'wrong', san: move.san }
      );
      return false;
    }

    const isLastTraineeMove = playedPlies + 2 >= totalPlies;
    if (isLastTraineeMove) {
      onComplete(mistakes === 0 && !hasUsedHint && !isHintShown);
    }
    setHasUsedHint(hasUsedHint || isHintShown);
    setPlayedPlies(playedPlies + 1);
    setMistakesOnMove(0);
    setIsHintRequested(false);
    setFeedback(undefined);
    return true;
  };

  const hintSquares = isHintShown
    ? getMoveSquares(fen, expectedSan)
    : undefined;
  const arrows: Array<BoardArrow> = hintSquares
    ? [{ ...hintSquares, color: HINT_ARROW_COLOR }]
    : [];
  const isClean = mistakes === 0 && !hasUsedHint;

  return (
    <BoardLayout
      board={
        <Board
          id={BOARD_ID}
          fen={fen}
          orientation={TRAINEE_COLOR}
          arrows={arrows}
          movableColor={isTraineeTurn ? TRAINEE_COLOR : undefined}
          onMove={handleMove}
        />
      }
    >
      <Card className='shrink-0'>
        <CardContent className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='font-mono'>
                {line.eco}
              </Badge>
              <h2 className='text-base font-semibold'>{line.name}</h2>
            </div>
            <p className='font-mono text-xs text-muted-foreground'>
              {playedPlies > 0
                ? formatMoveLine(line.moves.slice(0, playedPlies), 1)
                : t('NoMovesYet')}
            </p>
          </div>
          <div className='flex flex-col gap-1.5'>
            <span className='text-xs text-muted-foreground'>
              {t('DrillProgress', { played: playedPlies, total: totalPlies })}
            </span>
            <Progress
              aria-label={t('DrillProgressLabel')}
              value={playedPlies}
              max={totalPlies}
            />
          </div>
          <DrillStatus
            key={mistakes}
            isFinished={isFinished}
            isClean={isClean}
            isTraineeTurn={isTraineeTurn}
            feedback={feedback}
          />
          <div className='flex flex-wrap gap-2'>
            {!isFinished && (
              <Button
                variant='outline'
                size='sm'
                disabled={!isTraineeTurn || isHintShown}
                onClick={() => setIsHintRequested(true)}
              >
                <Lightbulb />
                {t('ShowHint')}
              </Button>
            )}
            {children}
          </div>
        </CardContent>
      </Card>
    </BoardLayout>
  );
};

const DrillStatus: React.FC<DrillStatusProps> = ({
  isFinished,
  isClean,
  isTraineeTurn,
  feedback,
}) => {
  const { t } = useTrainerTranslation();

  if (isFinished) {
    return (
      <p
        role='status'
        className='flex items-center gap-2 rounded-md border px-3 py-2 text-sm'
      >
        {isClean ? (
          <CircleCheck className='size-4 shrink-0 text-label-positive' />
        ) : (
          <CircleX className='size-4 shrink-0 text-label-mistake' />
        )}
        {isClean ? t('LineCompletedClean') : t('LineCompletedWithMistakes')}
      </p>
    );
  }
  if (feedback) {
    return (
      <p
        role='status'
        className='flex animate-shake items-center gap-2 rounded-md border px-3 py-2 text-sm'
      >
        <CircleX className='size-4 shrink-0 text-label-blunder' />
        {feedback.kind === 'otherLine'
          ? t('MoveFromOtherLine', { move: feedback.san, name: feedback.name })
          : t('MoveNotInLine', { move: feedback.san })}
      </p>
    );
  }
  return (
    <p
      role='status'
      className='rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground'
    >
      {isTraineeTurn ? t('YourMove') : t('OpponentMoving')}
    </p>
  );
};
