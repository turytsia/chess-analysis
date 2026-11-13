import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';

import { Board, type SquareHighlight } from '../../components/Board';
import { BoardLayout } from '../../components/BoardLayout';
import { BoardPage } from '../../components/BoardPage';
import { EvalBar } from '../../components/EvalBar';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/Tabs';
import { isCriticalLabel } from '../../services/classify';
import { getGame, type StoredGame } from '../../services/db';
import { getSideToMove } from '../../services/notation';
import { getPositions, parsePgn } from '../../services/pgn';
import { buildAnnotatedPgn } from '../../services/pgnExport';
import { useAnalysisTranslation } from '../../translations/hooks';
import { toBestMoveArrows } from '../../utilities/boardArrows';
import { downloadTextFile } from '../../utilities/download';
import { toHref } from '../../utilities/router';
import { AnalysisControls } from './AnalysisControls';
import { BoardTools } from './BoardTools';
import { CriticalMoments } from './CriticalMoments';
import { EvalGraph } from './EvalGraph';
import type { GameLine } from './exploration';
import { ExplorationPanel } from './ExplorationPanel';
import { GameHeader } from './GameHeader';
import { MoveInsight } from './MoveInsight';
import { getLabelColor } from '../../components/MoveLabelIcon';
import { MoveList } from './MoveList';
import { MoveNavigation } from './MoveNavigation';
import { ReportPanel } from './ReportPanel';
import { useExplorationAnalysis } from './useExplorationAnalysis';
import { useGameAnalysis } from './useGameAnalysis';
import { useGameNavigation } from './useGameNavigation';

const BOARD_ID = 'analysis-board';
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
  const gameLine = useMemo(
    (): GameLine => ({ moves: parsed.moves, positions: getPositions(parsed) }),
    [parsed]
  );
  const analysis = useGameAnalysis(game, parsed);
  const navigation = useGameNavigation(gameLine);
  const [orientation, setOrientation] = useState(game.userColor);
  const [isBestMoveShown, setIsBestMoveShown] = useState(true);

  const { moves } = parsed;
  const { evals, report } = analysis;
  const { ply, variation, cursor, fen, isExploring } = navigation;
  const exploration = useExplorationAnalysis({
    game: gameLine,
    gameEvals: evals,
    navigation,
  });
  const gameMove = moves[ply - 1];
  const exploredMove = variation[cursor - 1];
  const assessment = exploredMove
    ? exploration.assessments[cursor - 1]
    : report.assessments[ply - 1];
  const evaluation = isExploring ? exploration.evaluation : evals[ply];
  const isEvaluationPending = isExploring
    ? !exploration.hasFailed
    : analysis.run !== undefined;
  const nextCriticalIndex = report.assessments.findIndex(
    (candidate, index) =>
      index >= ply &&
      candidate !== undefined &&
      isCriticalLabel(candidate.label)
  );

  const handleExport = (): void => {
    downloadTextFile(
      `${game.white.name}-vs-${game.black.name}.pgn`,
      buildAnnotatedPgn({
        headers: parsed.headers,
        moves,
        evals,
        assessments: report.assessments,
      }),
      PGN_MIME_TYPE
    );
  };

  const lastMove = exploredMove ?? gameMove;
  const highlightColor = assessment
    ? getLabelColor(assessment.label)
    : LAST_MOVE_COLOR;
  const highlights: Array<SquareHighlight> = lastMove
    ? [
        { square: lastMove.from, color: highlightColor },
        { square: lastMove.to, color: highlightColor },
      ]
    : [];

  return (
    <BoardPage fitsViewport>
      <GameHeader game={game} onExport={handleExport}>
        <AnalysisControls game={game} parsed={parsed} analysis={analysis} />
      </GameHeader>
      <BoardLayout
        evalBar={
          <EvalBar
            evaluation={evaluation}
            orientation={orientation}
            isPending={isEvaluationPending}
          />
        }
        board={
          <Board
            id={BOARD_ID}
            fen={fen}
            orientation={orientation}
            arrows={isBestMoveShown ? toBestMoveArrows(evaluation) : []}
            highlights={highlights}
            movableColor={getSideToMove(fen)}
            onMove={navigation.playMove}
          />
        }
        tools={
          <BoardTools
            isBestMoveShown={isBestMoveShown}
            onToggleBestMove={() => setIsBestMoveShown(!isBestMoveShown)}
            onFlipBoard={() =>
              setOrientation(orientation === 'white' ? 'black' : 'white')
            }
          />
        }
        controls={
          <MoveNavigation
            canStepBack={navigation.canStepBack}
            canStepForward={navigation.canStepForward}
            nextCriticalPly={
              nextCriticalIndex === -1 ? undefined : nextCriticalIndex + 1
            }
            onStep={navigation.step}
            onSelectPly={navigation.selectPly}
          />
        }
      >
        <Card className='shrink-0'>
          <CardContent className='p-3'>
            {isExploring ? (
              <ExplorationPanel
                fen={fen}
                basePly={ply}
                baseMove={gameMove}
                variation={variation}
                assessments={exploration.assessments}
                cursor={cursor}
                evaluation={evaluation}
                hasEngineFailed={exploration.hasFailed}
                onSelectCursor={navigation.selectCursor}
                onReset={navigation.resetExploration}
              />
            ) : (
              <MoveInsight
                fen={fen}
                ply={ply}
                move={gameMove}
                assessment={report.assessments[ply - 1]}
                evaluation={evaluation}
              />
            )}
          </CardContent>
        </Card>
        <Card className='shrink-0'>
          <CardContent className='p-3'>
            <EvalGraph
              moves={moves}
              evals={evals}
              assessments={report.assessments}
              ply={ply}
              onSelectPly={navigation.selectPly}
            />
          </CardContent>
        </Card>
        <Card className='lg:flex lg:min-h-28 lg:flex-1 lg:flex-col'>
          <CardContent className='p-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col'>
            <Tabs defaultValue='moves' className='gap-3 lg:min-h-0 lg:flex-1'>
              <TabsList className='w-full shrink-0'>
                <TabsTrigger value='moves'>{t('Moves')}</TabsTrigger>
                <TabsTrigger value='report'>{t('Report')}</TabsTrigger>
                <TabsTrigger value='moments'>
                  {t('CriticalMoments')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value='moves' className='lg:min-h-0'>
                <MoveList
                  moves={moves}
                  assessments={report.assessments}
                  ply={ply}
                  onSelectPly={navigation.selectPly}
                />
              </TabsContent>
              <TabsContent
                value='report'
                className='lg:min-h-0 lg:overflow-y-auto'
              >
                <ReportPanel game={game} report={report} />
              </TabsContent>
              <TabsContent
                value='moments'
                className='lg:min-h-0 lg:overflow-y-auto'
              >
                <CriticalMoments
                  moves={moves}
                  assessments={report.assessments}
                  ply={ply}
                  onSelectPly={navigation.selectPly}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </BoardLayout>
    </BoardPage>
  );
};
