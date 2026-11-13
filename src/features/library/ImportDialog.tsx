import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/Tabs';
import { useLibraryTranslation } from '../../translations/hooks';
import { ChesscomImportForm } from './ChesscomImportForm';
import { PgnImportForm } from './PgnImportForm';

export type ImportTab = 'chesscom' | 'pgn';

interface ImportDialogProps {
  tab: ImportTab | undefined;
  onTabChange: (tab: ImportTab | undefined) => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  tab,
  onTabChange,
}) => {
  const { t } = useLibraryTranslation();
  const close = (): void => onTabChange(undefined);

  return (
    <Dialog
      open={tab !== undefined}
      onOpenChange={(isOpen) => !isOpen && close()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('ImportGames')}</DialogTitle>
          <DialogDescription>{t('ImportGamesDescription')}</DialogDescription>
        </DialogHeader>
        <Tabs
          value={tab ?? 'chesscom'}
          onValueChange={(value) =>
            onTabChange(value === 'pgn' ? 'pgn' : 'chesscom')
          }
        >
          <TabsList className='w-full'>
            <TabsTrigger value='chesscom'>{t('Chesscom')}</TabsTrigger>
            <TabsTrigger value='pgn'>{t('Pgn')}</TabsTrigger>
          </TabsList>
          <TabsContent value='chesscom'>
            <ChesscomImportForm onImported={close} />
          </TabsContent>
          <TabsContent value='pgn'>
            <PgnImportForm onImported={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
