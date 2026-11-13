import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { listGames, type StoredGame } from '../../services/db';
import { useImportStore } from '../../stores/importStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLibraryTranslation } from '../../translations/hooks';
import { EmptyLibrary } from './EmptyLibrary';
import {
  DEFAULT_GAME_FILTERS,
  filterGames,
  getOpeningFamilies,
  type GameFilters,
} from './filterGames';
import { GameFilterBar } from './GameFilterBar';
import { GameTable } from './GameTable';
import { ImportDialog, type ImportTab } from './ImportDialog';
import { ImportProgressBar } from './ImportProgressBar';
import { useChesscomImport } from './useChesscomImport';

const PAGE_SIZE = 25;
const SYNC_MONTH_LIMIT = 2;

interface LibraryContentProps {
  games: Array<StoredGame>;
  onImport: () => void;
}

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export const GameLibrary: React.FC = () => {
  const games = useLiveQuery(listGames);
  const [importTab, setImportTab] = useState<ImportTab | undefined>();

  if (!games) {
    return null;
  }
  return (
    <>
      {games.length === 0 ? (
        <EmptyLibrary onImportPgn={() => setImportTab('pgn')} />
      ) : (
        <LibraryContent
          games={games}
          onImport={() => setImportTab('chesscom')}
        />
      )}
      <ImportDialog tab={importTab} onTabChange={setImportTab} />
    </>
  );
};

const LibraryContent: React.FC<LibraryContentProps> = ({ games, onImport }) => {
  const { t } = useLibraryTranslation();
  const username = useSettingsStore((state) => state.username);
  const importProgress = useImportStore((state) => state.progress);
  const isImporting = importProgress !== undefined;
  const importGames = useChesscomImport();
  const [filters, setFilters] = useState<GameFilters>(DEFAULT_GAME_FILTERS);
  const [page, setPage] = useState(0);
  const [now] = useState(() => Date.now());

  const filtered = useMemo(
    () => filterGames(games, filters, now),
    [games, filters, now]
  );
  const openings = useMemo(() => getOpeningFamilies(games), [games]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);

  return (
    <div className='flex flex-col gap-6'>
      <header className='flex flex-wrap items-end justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {t('Games')}
          </h1>
          <p className='text-sm text-muted-foreground'>
            {t('GamesShownWithCount', {
              count: games.length,
              shown: filtered.length,
            })}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {username && (
            <Button
              variant='outline'
              disabled={isImporting}
              onClick={() => importGames(username, SYNC_MONTH_LIMIT)}
            >
              <RefreshCw className={isImporting ? 'animate-spin' : undefined} />
              {t('SyncGames')}
            </Button>
          )}
          <Button onClick={onImport}>
            <Plus />
            {t('ImportGames')}
          </Button>
        </div>
      </header>
      {importProgress && (
        <Card className='p-4'>
          <ImportProgressBar progress={importProgress} />
        </Card>
      )}
      <GameFilterBar
        filters={filters}
        openings={openings}
        onFiltersChange={(next) => {
          setFilters(next);
          setPage(0);
        }}
      />
      <Card className='overflow-hidden'>
        {filtered.length === 0 ? (
          <p className='px-4 py-16 text-center text-sm text-muted-foreground'>
            {t('NoGamesMatchFilters')}
          </p>
        ) : (
          <GameTable
            games={filtered.slice(
              currentPage * PAGE_SIZE,
              (currentPage + 1) * PAGE_SIZE
            )}
          />
        )}
      </Card>
      {pageCount > 1 && (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};

const Pagination: React.FC<PaginationProps> = ({
  page,
  pageCount,
  onPageChange,
}) => {
  const { t } = useLibraryTranslation();

  return (
    <nav
      aria-label={t('Pagination')}
      className='flex items-center justify-end gap-3'
    >
      <span className='text-sm text-muted-foreground tabular-nums'>
        {t('PageOfTotal', { page: page + 1, total: pageCount })}
      </span>
      <Button
        variant='outline'
        size='iconSm'
        aria-label={t('PreviousPage')}
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant='outline'
        size='iconSm'
        aria-label={t('NextPage')}
        disabled={page === pageCount - 1}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight />
      </Button>
    </nav>
  );
};
