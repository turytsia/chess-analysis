import { useLiveQuery } from 'dexie-react-hooks';
import { GraduationCap, ListTree } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { listGames } from '../../services/db';
import {
  findTheoryDeviation,
  groupDeviations,
  type DeviationGroup,
  type DeviationSide,
} from '../../services/deviations';
import type { Opening, OpeningBook } from '../../services/openings';
import { useTrainerTranslation } from '../../translations/hooks';
import {
  formatDate,
  formatMoveLine,
  formatMoveNumber,
} from '../../utilities/format';
import { toHref } from '../../utilities/router';

const CARO_KANN_ENTRY_PLIES = 2;
const MAX_PRACTICE_LINES = 5;
const MAX_LISTED_GAMES = 4;

interface GameDeviationsProps {
  book: OpeningBook;
  onPractice: (lines: Array<Opening>) => void;
  onExplore: (path: Array<string>) => void;
}

interface DeviationCardProps {
  group: DeviationGroup;
  onPractice: () => void;
  onExplore: () => void;
}

export const GameDeviations: React.FC<GameDeviationsProps> = ({
  book,
  onPractice,
  onExplore,
}) => {
  const { t } = useTrainerTranslation();
  const [side, setSide] = useState<DeviationSide>('user');
  const games = useLiveQuery(listGames);
  const deviations = useMemo(
    () =>
      (games ?? []).flatMap(
        (game) =>
          findTheoryDeviation(book.root, game, CARO_KANN_ENTRY_PLIES) ?? []
      ),
    [games, book]
  );

  if (!games) {
    return null;
  }
  const groups = groupDeviations(
    deviations.filter((deviation) => deviation.side === side)
  );
  const getPracticeLines = (path: Array<string>): Array<Opening> =>
    book.openings
      .filter(
        ({ moves }) =>
          moves.length > path.length &&
          path.every((san, index) => moves[index] === san)
      )
      .sort((a, b) => a.moves.length - b.moves.length)
      .slice(0, MAX_PRACTICE_LINES);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-sm text-muted-foreground'>
          {t('DeviationsSummary', { count: deviations.length })}
        </p>
        <Select
          aria-label={t('FilterDeviations')}
          className='w-auto'
          value={side}
          options={[
            { value: 'user', label: t('YouLeftTheory') },
            { value: 'opponent', label: t('OpponentLeftTheory') },
          ]}
          onValueChange={setSide}
        />
      </div>
      {groups.length === 0 && (
        <p className='rounded-lg border border-dashed px-4 py-16 text-center text-sm text-muted-foreground'>
          {games.length === 0 ? t('NoGamesImported') : t('NoDeviationsFound')}
        </p>
      )}
      {groups.map((group) => (
        <DeviationCard
          key={group.key}
          group={group}
          onPractice={() => onPractice(getPracticeLines(group.path))}
          onExplore={() => onExplore(group.path)}
        />
      ))}
    </div>
  );
};

const DeviationCard: React.FC<DeviationCardProps> = ({
  group,
  onPractice,
  onExplore,
}) => {
  const { t } = useTrainerTranslation();
  const playedMove = `${formatMoveNumber(group.ply)} ${group.playedSan}`;

  return (
    <Card>
      <CardContent className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='flex min-w-0 flex-col gap-1.5'>
            <div className='flex items-center gap-2'>
              {group.opening && (
                <Badge variant='outline' className='font-mono'>
                  {group.opening.eco}
                </Badge>
              )}
              <h3 className='text-sm font-medium'>
                {group.opening?.name ?? t('UnnamedLine')}
              </h3>
            </div>
            <p className='font-mono text-xs text-muted-foreground'>
              {formatMoveLine(group.path, 1)}
            </p>
          </div>
          <Badge variant='secondary'>
            {t('GamesWithCount', { count: group.games.length })}
          </Badge>
        </div>
        <dl className='grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]'>
          <dt className='text-muted-foreground'>
            {group.side === 'user' ? t('YouPlayed') : t('OpponentPlayed')}
          </dt>
          <dd className='font-mono font-medium'>{playedMove}</dd>
          <dt className='text-muted-foreground'>{t('BookMoves')}</dt>
          <dd>
            <ul className='flex flex-col gap-1'>
              {group.bookMoves.map(({ san, name }) => (
                <li key={san} className='flex items-baseline gap-2'>
                  <span className='font-mono font-medium'>
                    {formatMoveNumber(group.ply)} {san}
                  </span>
                  <span className='truncate text-muted-foreground'>{name}</span>
                </li>
              ))}
            </ul>
          </dd>
          <dt className='text-muted-foreground'>{t('Games')}</dt>
          <dd>
            <ul className='flex flex-wrap gap-x-3 gap-y-1'>
              {group.games.slice(0, MAX_LISTED_GAMES).map((game) => (
                <li key={game.id}>
                  <a
                    href={toHref({ name: 'game', gameId: game.id })}
                    className='rounded-sm underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'
                  >
                    {t('GameAgainstOnDate', {
                      opponent:
                        game.userColor === 'white'
                          ? game.black.name
                          : game.white.name,
                      date: formatDate(game.playedAt),
                    })}
                  </a>
                </li>
              ))}
            </ul>
          </dd>
        </dl>
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' size='sm' onClick={onExplore}>
            <ListTree />
            {t('ExplorePosition')}
          </Button>
          <Button variant='outline' size='sm' onClick={onPractice}>
            <GraduationCap />
            {t('PracticeBookLines')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
