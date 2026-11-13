import { Square } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/ui/Progress';
import type { ImportProgress } from '../../services/importer';
import { useImportStore } from '../../stores/importStore';
import { useLibraryTranslation } from '../../translations/hooks';

interface ImportProgressBarProps {
  progress: ImportProgress;
}

export const ImportProgressBar: React.FC<ImportProgressBarProps> = ({
  progress,
}) => {
  const { t } = useLibraryTranslation();
  const cancelImport = useImportStore((state) => state.cancelImport);

  return (
    <div className='flex items-center gap-3'>
      <div className='flex flex-1 flex-col gap-1.5'>
        <span className='text-xs text-muted-foreground'>
          {t('ImportProgress', {
            completed: progress.completed,
            total: progress.total,
            imported: progress.imported,
          })}
        </span>
        <Progress
          aria-label={t('ImportProgressLabel')}
          value={progress.completed}
          max={progress.total}
        />
      </div>
      <Button variant='outline' size='sm' onClick={cancelImport}>
        <Square />
        {t('Cancel')}
      </Button>
    </div>
  );
};
