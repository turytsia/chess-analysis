import { LoaderCircle } from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import type { GameOutcome, PlayerInfo, StoredGame } from '../../services/db';
import { useAnalysisStore } from '../../stores/analysisStore';
import { useLibraryTranslation } from '../../translations/hooks';
import { cn } from '../../utilities/cn';
import {
  formatDate,
  formatPercent,
  formatTimeControl,
} from '../../utilities/format';
import { navigate, toHref } from '../../utilities/router';
import { useLocalizeTimeClass } from '../../utilities/useLocalizeTimeClass';

interface GameTableProps {
  games: Array<StoredGame>;
}

interface GameRowProps {
  game: StoredGame;
  isAnalyzing: boolean;
}

interface PlayerLineProps {
  player: PlayerInfo;
  isUser: boolean;
  isWhite: boolean;
}

interface OutcomeBadgeProps {
  outcome: GameOutcome;
}

export const GameTable: React.FC<GameTableProps> = ({ games }) => {
  const { t } = useLibraryTranslation();
  const analyzingGameId = useAnalysisStore((state) => state.run?.gameId);

  return (
    <Table>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <TableHead>{t('Players')}</TableHead>
          <TableHead>{t('Result')}</TableHead>
          <TableHead>{t('Opening')}</TableHead>
          <TableHead className='text-right'>{t('Moves')}</TableHead>
          <TableHead>{t('TimeControl')}</TableHead>
          <TableHead>{t('Date')}</TableHead>
          <TableHead className='text-right'>{t('Accuracy')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {games.map((game) => (
          <GameRow
            key={game.id}
            game={game}
            isAnalyzing={game.id === analyzingGameId}
          />
        ))}
      </TableBody>
    </Table>
  );
};

const GameRow: React.FC<GameRowProps> = ({ game, isAnalyzing }) => {
  const { t } = useLibraryTranslation();
  const localizeTimeClass = useLocalizeTimeClass();
  const timeControl = formatTimeControl(game.timeControl);

  return (
    <TableRow
      className='cursor-pointer'
      onClick={() => navigate({ name: 'game', gameId: game.id })}
    >
      <TableCell>
        <a
          href={toHref({ name: 'game', gameId: game.id })}
          aria-label={t('OpenGameLabel', {
            white: game.white.name,
            black: game.black.name,
          })}
          className='flex flex-col gap-0.5 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
          onClick={(event) => event.stopPropagation()}
        >
          <PlayerLine
            player={game.white}
            isUser={game.userColor === 'white'}
            isWhite
          />
          <PlayerLine
            player={game.black}
            isUser={game.userColor === 'black'}
            isWhite={false}
          />
        </a>
      </TableCell>
      <TableCell>
        <OutcomeBadge outcome={game.outcome} />
      </TableCell>
      <TableCell className='max-w-72'>
        <div className='flex items-center gap-2'>
          {game.eco && (
            <span className='font-mono text-xs text-muted-foreground'>
              {game.eco}
            </span>
          )}
          <span className='truncate'>
            {game.opening ?? t('UnknownOpening')}
          </span>
        </div>
      </TableCell>
      <TableCell className='text-right font-mono text-xs tabular-nums'>
        {Math.ceil(game.sanMoves.length / 2)}
      </TableCell>
      <TableCell className='text-muted-foreground'>
        <span className='flex items-baseline gap-2'>
          {localizeTimeClass(game.timeClass)}
          {timeControl && (
            <span className='font-mono text-xs tabular-nums'>
              {timeControl}
            </span>
          )}
        </span>
      </TableCell>
      <TableCell className='text-muted-foreground'>
        {formatDate(game.playedAt)}
      </TableCell>
      <TableCell className='text-right'>
        {isAnalyzing && (
          <Badge variant='secondary'>
            <LoaderCircle className='animate-spin' />
            {t('Analyzing')}
          </Badge>
        )}
        {!isAnalyzing && game.accuracy && (
          <span className='font-mono text-xs font-medium tabular-nums'>
            {formatPercent(game.accuracy[game.userColor])}
          </span>
        )}
        {!isAnalyzing && !game.accuracy && (
          <Badge variant='muted'>{t('NotAnalyzed')}</Badge>
        )}
      </TableCell>
    </TableRow>
  );
};

const PlayerLine: React.FC<PlayerLineProps> = ({ player, isUser, isWhite }) => (
  <span className='flex items-center gap-2'>
    <span
      aria-hidden
      className={cn(
        'size-2.5 shrink-0 rounded-[3px] border border-foreground/30',
        isWhite ? 'bg-eval-white' : 'bg-eval-black'
      )}
    />
    <span className={cn(isUser ? 'font-medium' : 'text-muted-foreground')}>
      {player.name}
    </span>
    {player.rating !== undefined && (
      <span className='font-mono text-xs text-muted-foreground tabular-nums'>
        {player.rating}
      </span>
    )}
  </span>
);

const OutcomeBadge: React.FC<OutcomeBadgeProps> = ({ outcome }) => {
  const { t } = useLibraryTranslation();

  if (outcome === 'win') {
    return <Badge>{t('Win')}</Badge>;
  }
  if (outcome === 'loss') {
    return <Badge variant='outline'>{t('Loss')}</Badge>;
  }
  return (
    <Badge variant='secondary'>
      {outcome === 'draw' ? t('Draw') : t('Unfinished')}
    </Badge>
  );
};
