import { useLiveQuery } from 'dexie-react-hooks';

import { Label } from '../../components/ui/Label';
import { Textarea } from '../../components/ui/Textarea';
import { getNoteText, saveNote } from '../../services/db';
import { useAnalysisTranslation } from '../../translations/hooks';

const NOTES_FIELD_ID = 'game-notes';

interface GameNotesProps {
  gameId: string;
}

export const GameNotes: React.FC<GameNotesProps> = ({ gameId }) => {
  const { t } = useAnalysisTranslation();
  const storedText = useLiveQuery(() => getNoteText(gameId), [gameId]);

  return (
    <div className='flex flex-col gap-2'>
      <Label htmlFor={NOTES_FIELD_ID}>{t('Notes')}</Label>
      {storedText !== undefined && (
        <Textarea
          key={gameId}
          id={NOTES_FIELD_ID}
          defaultValue={storedText}
          placeholder={t('NotesPlaceholder')}
          className='min-h-48'
          onChange={(event) => saveNote(gameId, event.target.value)}
        />
      )}
      <p className='text-xs text-muted-foreground'>{t('NotesSavedHint')}</p>
    </div>
  );
};
