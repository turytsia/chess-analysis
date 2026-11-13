import { Download } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { useImportStore } from '../../stores/importStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLibraryTranslation } from '../../translations/hooks';
import { ImportProgressBar } from './ImportProgressBar';
import { useChesscomImport } from './useChesscomImport';

const USERNAME_FIELD_ID = 'chesscom-username';
const PERIOD_FIELD_ID = 'chesscom-period';
const ALL_TIME = 'all';
const DEFAULT_MONTH_LIMIT = '3';

interface ChesscomImportFormProps {
  onImported?: () => void;
}

export const ChesscomImportForm: React.FC<ChesscomImportFormProps> = ({
  onImported,
}) => {
  const { t } = useLibraryTranslation();
  const savedUsername = useSettingsStore((state) => state.username);
  const progress = useImportStore((state) => state.progress);
  const importGames = useChesscomImport();
  const [username, setUsername] = useState(savedUsername);
  const [monthLimit, setMonthLimit] = useState(DEFAULT_MONTH_LIMIT);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const isImported = await importGames(
      username,
      monthLimit === ALL_TIME ? undefined : Number(monthLimit)
    );
    isImported && onImported?.();
  };

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <Label htmlFor={USERNAME_FIELD_ID}>{t('ChesscomUsername')}</Label>
        <Input
          id={USERNAME_FIELD_ID}
          value={username}
          placeholder={t('ChesscomUsernamePlaceholder')}
          autoComplete='off'
          autoCapitalize='none'
          spellCheck={false}
          disabled={progress !== undefined}
          onChange={(event) => setUsername(event.target.value)}
        />
        <p className='text-xs text-muted-foreground'>
          {t('UsernameSavedHint')}
        </p>
      </div>
      <div className='flex flex-col gap-2'>
        <Label htmlFor={PERIOD_FIELD_ID}>{t('ImportPeriod')}</Label>
        <Select
          id={PERIOD_FIELD_ID}
          aria-label={t('ImportPeriod')}
          value={monthLimit}
          disabled={progress !== undefined}
          options={[
            { value: '1', label: t('LastMonth') },
            { value: '3', label: t('LastThreeMonths') },
            { value: '6', label: t('LastSixMonths') },
            { value: '12', label: t('LastTwelveMonths') },
            { value: ALL_TIME, label: t('AllTime') },
          ]}
          onValueChange={setMonthLimit}
        />
      </div>
      {progress ? (
        <ImportProgressBar progress={progress} />
      ) : (
        <Button type='submit' disabled={username.trim().length === 0}>
          <Download />
          {t('LoadGames')}
        </Button>
      )}
    </form>
  );
};
