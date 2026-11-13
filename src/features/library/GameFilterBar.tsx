import { Search } from 'lucide-react';

import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useLibraryTranslation } from '../../translations/hooks';
import { ALL_FILTER, type GameFilters } from './filterGames';

interface GameFilterBarProps {
  filters: GameFilters;
  openings: Array<string>;
  onFiltersChange: (filters: GameFilters) => void;
}

export const GameFilterBar: React.FC<GameFilterBarProps> = ({
  filters,
  openings,
  onFiltersChange,
}) => {
  const { t } = useLibraryTranslation();
  const update = (changes: Partial<GameFilters>): void =>
    onFiltersChange({ ...filters, ...changes });

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <div className='relative min-w-48 flex-1'>
        <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          type='search'
          value={filters.search}
          placeholder={t('SearchGamesPlaceholder')}
          aria-label={t('SearchGames')}
          className='pl-9'
          onChange={(event) => update({ search: event.target.value })}
        />
      </div>
      <Select
        aria-label={t('FilterByPeriod')}
        className='w-auto'
        value={filters.period}
        options={[
          { value: ALL_FILTER, label: t('AllTime') },
          { value: 'week', label: t('LastSevenDays') },
          { value: 'month', label: t('LastThirtyDays') },
          { value: 'quarter', label: t('LastNinetyDays') },
          { value: 'year', label: t('LastYear') },
        ]}
        onValueChange={(period) => update({ period })}
      />
      <Select
        aria-label={t('FilterByColor')}
        className='w-auto'
        value={filters.color}
        options={[
          { value: ALL_FILTER, label: t('AnyColor') },
          { value: 'white', label: t('White') },
          { value: 'black', label: t('Black') },
        ]}
        onValueChange={(color) => update({ color })}
      />
      <Select
        aria-label={t('FilterByResult')}
        className='w-auto'
        value={filters.outcome}
        options={[
          { value: ALL_FILTER, label: t('AnyResult') },
          { value: 'win', label: t('Wins') },
          { value: 'loss', label: t('Losses') },
          { value: 'draw', label: t('Draws') },
        ]}
        onValueChange={(outcome) => update({ outcome })}
      />
      <Select
        aria-label={t('FilterByOpening')}
        className='w-auto max-w-56'
        value={filters.opening}
        options={[
          { value: ALL_FILTER, label: t('AnyOpening') },
          ...openings.map((opening) => ({ value: opening, label: opening })),
        ]}
        onValueChange={(opening) => update({ opening })}
      />
      <Select
        aria-label={t('FilterByStatus')}
        className='w-auto'
        value={filters.status}
        options={[
          { value: ALL_FILTER, label: t('AnyStatus') },
          { value: 'analyzed', label: t('Analyzed') },
          { value: 'pending', label: t('NotAnalyzed') },
        ]}
        onValueChange={(status) => update({ status })}
      />
    </div>
  );
};
