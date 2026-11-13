import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';

import {
  Board,
  type BoardArrow,
  type SquareHighlight,
} from '../../components/Board';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/Tabs';
import { isCriticalLabel } from '../../services/classify';
import { getGame, getNoteText, type StoredGame } from '../../services/db';
import { getPositions, parsePgn } from '../../services/pgn';
import { buildAnnotatedPgn } from '../../services/pgnExport';
import { useAnalysisTranslation } from '../../translations/hooks';
import { downloadTextFile } from '../../utilities/download';
import { toHref } from '../../utilities/router';
import { AnalysisControls } from './AnalysisControls';
import { CriticalMoments } from './CriticalMoments';
import { EvalBar } from './EvalBar';
import { EvalGraph } from './EvalGraph';
import { GameHeader } from './GameHeader';
import { GameNotes } from './GameNotes';
import { MoveInsight } from './MoveInsight';
import { getLabelColor } from './MoveLabelIcon';
import { MoveList } from './MoveList';
import { MoveNavigation } from './MoveNavigation';
import { ReportPanel } from './ReportPanel';
import { useGameAnalysis } from './useGameAnalysis';
import { useMoveNavigation } from './useMoveNavigation';

const BOARD_ID = 'analysis-board';
const BEST_MOVE_ARROW_COLOR = 'var(--label-positive)';
const LAST_MOVE_COLOR = 'var(--board-highlight)';
const PGN_MIME_TYPE = 'application/x-chess-pgn';

interface AnalysisViewProps {
  gameId: string;
}

interface GameAnalysisScreenProps {
  game: StoredGame;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ gameId }) => {
  const { t } = useAnalysisTranslation();
  const result = useLiveQuery(
    async () => ({ game: await getGame(gameId) }),
    [gameId]
  );

  if (!result) {
    return null;
  }
  if (!result.game) {
    return (
      <div className='flex flex-col items-center gap-4 py-24 text-center'>
        <p className='text-sm text-muted-foreground'>{t('GameNotFound')}</p>
        <Button variant='outline' asChild>
          <a href={toHref({ name: 'library' })}>{t('Games')}</a>
        </Button>
      </div>
    );
  }
  return <GameAnalysisScreen key={result.game.id} game={result.game} />;
};

const GameAnalysisScreen: React.FC<GameAnalysisScreenProps> = ({ game }) => {
  const { t } = useAnalysisTranslation();
  const parsed = useMemo(() => parsePgn(game.pgn), [game.pgn]);
  const positions = useMemo(() => getPositions(parsed), [parsed]);
  const analysis = useGameAnalysis(game, parsed);
  const { ply, selectPly } = useMoveNavigation(parsed.moves.length);
  const [orientation, setOrientation] = useState(game.userColor);
  const [isBestMoveShown, setIsBestMoveShown] = useState(true);

  const { moves } = parsed;
  const { evals, report } = analysis;
  const move = moves[ply - 1];
  const assessment = report.assessments[ply - 1];
  const evaluation = evals[ply];
  const bestUci = evaluation?.lines[0]?.pv[0];
  const nextCriticalIndex = report.assessments.findIndex(
    (candidate, index) =>
      index >= ply &&
      candidate !== undefined &&
      isCriticalLabel(candidate.label)
  );

  const handleExport = async (): Promise<void> => {
    downloadTextFile(
      `${game.white.name}-vs-${game.black.name}.pgn`,
      buildAnnotatedPgn({
        headers: parsed.headers,
        moves,
        evals,
        assessments: report.assessments,
        notes: await getNoteText(game.id),
      }),
      PGN_MIME_TYPE
    );
  };

  const arrows: Array<BoardArrow> =
    isBestMoveShown && bestUci
      ? [
          {
            from: bestUci.slice(0, 2),
            to: bestUci.slice(2, 4),
            color: BEST_MOVE_ARROW_COLOR,
          },
        ]
      : [];
  const highlightColor = assessment
    ? getLabelColor(assessment.label)
    : LAST_MOVE_COLOR;
  const highlights: Array<SquareHighlight> = move
    ? [
        { square: move.from, color: highlightColor },
        { square: move.to, color: highlightColor },
      ]
    : [];

  return (
    <div className='flex flex-col gap-6'>
      <GameHeader game={game} onExport={handleExport}>
        <AnalysisControls game={game} parsed={parsed} analysis={analysis} />
      </GameHeader>
      <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_27rem]'>
        <div className='mx-auto flex w-full max-w-[40rem] flex-col gap-4'>
          <div className='flex gap-2'>
            <EvalBar evaluation={evaluation} orientation={orientation} />
            <div className='min-w-0 flex-1'>
              <Board
                id={BOARD_ID}
                fen={positions[ply]}
                orientation={orientation}
                arrows={arrows}
                highlights={highlights}
              />
            </div>
          </div>
          <MoveNavigation
            ply={ply}
            lastPly={moves.length}
            nextCriticalPly={
              nextCriticalIndex === -1 ? undefined : nextCriticalIndex + 1
            }
            isBestMoveShown={isBestMoveShown}
            onSelectPly={selectPly}
            onFlipBoard={() =>
              setOrientation(orientation === 'white' ? 'black' : 'white')
            }
            onToggleBestMove={() => setIsBestMoveShown(!isBestMoveShown)}
          />
        </div>
        <div className='flex flex-col gap-4'>
          <Card>
            <CardContent>
              <MoveInsight
                fen={positions[ply]}
                ply={ply}
                move={move}
                assessment={assessment}
                evaluation={evaluation}
                previousEvaluation={evals[ply - 1]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <EvalGraph
                moves={moves}
                evals={evals}
                assessments={report.assessments}
                ply={ply}
                onSelectPly={selectPly}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Tabs defaultValue='moves'>
                <TabsList className='w-full'>
                  <TabsTrigger value='moves'>{t('Moves')}</TabsTrigger>
                  <TabsTrigger value='report'>{t('Report')}</TabsTrigger>
                  <TabsTrigger value='moments'>
                    {t('CriticalMoments')}
                  </TabsTrigger>
                  <TabsTrigger value='notes'>{t('Notes')}</TabsTrigger>
                </TabsList>
                <TabsContent value='moves'>
                  <MoveList
                    moves={moves}
                    assessments={report.assessments}
                    ply={ply}
                    onSelectPly={selectPly}
                  />
                </TabsContent>
                <TabsContent value='report'>
                  <ReportPanel game={game} report={report} />
                </TabsContent>
                <TabsContent value='moments'>
                  <CriticalMoments
                    moves={moves}
                    assessments={report.assessments}
                    ply={ply}
                    onSelectPly={selectPly}
                  />
                </TabsContent>
                <TabsContent value='notes'>
                  <GameNotes gameId={game.id} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
