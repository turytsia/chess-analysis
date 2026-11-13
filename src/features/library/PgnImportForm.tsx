import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../../components/ui/Button';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import type { PlayerColor } from '../../services/evaluation';
import { importFromPgn } from '../../services/importer';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLibraryTranslation } from '../../translations/hooks';

const PGN_FIELD_ID = 'pgn-text';
const COLOR_FIELD_ID = 'pgn-color';
const PGN_FILE_TYPES = '.pgn,.txt,text/plain,application/x-chess-pgn';

interface PgnImportFormProps {
  onImported: () => void;
}

export const PgnImportForm: React.FC<PgnImportFormProps> = ({ onImported }) => {
  const { t } = useLibraryTranslation();
  const username = useSettingsStore((state) => state.username);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [fallbackColor, setFallbackColor] = useState<PlayerColor>('white');
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    const contents = await Promise.all(files.map((file) => file.text()));
    setText(contents.join('\n\n'));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setIsImporting(true);
    try {
      const { imported, failed } = await importFromPgn({
        text,
        username,
        fallbackColor,
      });
      if (imported === 0 && failed > 0) {
        toast.error(t('PgnInvalid'));
        return;
      }
      toast.success(t('GamesImportedWithCount', { count: imported }), {
        description:
          failed > 0
            ? t('GamesSkippedWithCount', { count: failed })
            : undefined,
      });
      onImported();
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <Label htmlFor={PGN_FIELD_ID}>{t('PgnText')}</Label>
          <Button
            variant='outline'
            size='sm'
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload />
            {t('UploadFile')}
          </Button>
          <input
            ref={fileInputRef}
            type='file'
            accept={PGN_FILE_TYPES}
            multiple
            hidden
            aria-label={t('UploadFile')}
            onChange={handleFileChange}
          />
        </div>
        <Textarea
          id={PGN_FIELD_ID}
          value={text}
          placeholder={t('PgnPlaceholder')}
          spellCheck={false}
          className='max-h-64 min-h-40 font-mono text-xs'
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label htmlFor={COLOR_FIELD_ID}>{t('PlayedAs')}</Label>
        <Select
          id={COLOR_FIELD_ID}
          aria-label={t('PlayedAs')}
          value={fallbackColor}
          options={[
            { value: 'white', label: t('White') },
            { value: 'black', label: t('Black') },
          ]}
          onValueChange={setFallbackColor}
        />
        <p className='text-xs text-muted-foreground'>{t('PlayedAsHint')}</p>
      </div>
      <Button type='submit' disabled={isImporting || text.trim().length === 0}>
        <Upload />
        {t('ImportPgn')}
      </Button>
    </form>
  );
};
