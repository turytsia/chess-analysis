import { ChessKnight } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { useLibraryTranslation } from '../../translations/hooks';
import { ChesscomImportForm } from './ChesscomImportForm';

interface EmptyLibraryProps {
  onImportPgn: () => void;
}

export const EmptyLibrary: React.FC<EmptyLibraryProps> = ({ onImportPgn }) => {
  const { t } = useLibraryTranslation();

  return (
    <div className='mx-auto flex w-full max-w-md flex-col gap-4 py-12'>
      <div className='flex flex-col items-center gap-3 text-center'>
        <span className='flex size-11 items-center justify-center rounded-lg border bg-card'>
          <ChessKnight className='size-5' />
        </span>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {t('WelcomeTitle')}
        </h1>
        <p className='text-sm text-balance text-muted-foreground'>
          {t('WelcomeDescription')}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('LoadYourGames')}</CardTitle>
          <CardDescription>{t('LoadYourGamesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChesscomImportForm />
        </CardContent>
      </Card>
      <Button variant='ghost' onClick={onImportPgn}>
        {t('ImportPgnInstead')}
      </Button>
    </div>
  );
};
