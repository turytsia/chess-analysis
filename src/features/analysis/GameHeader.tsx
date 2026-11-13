import { ArrowLeft, Download, ExternalLink, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { Tooltip } from '../../components/ui/Tooltip';
import {
  deleteGame,
  type PlayerInfo,
  type StoredGame,
} from '../../services/db';
import { useAnalysisTranslation } from '../../translations/hooks';
import { formatDate, formatTimeControl } from '../../utilities/format';
import { navigate, toHref } from '../../utilities/router';
import { useLocalizeTimeClass } from '../../utilities/useLocalizeTimeClass';

interface GameHeaderProps {
  game: StoredGame;
  onExport: () => void;
  children: React.ReactNode;
}

interface PlayerNameProps {
  player: PlayerInfo;
  isUser: boolean;
}

interface DeleteGameDialogProps {
  gameId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  onExport,
  children,
}) => {
  const { t } = useAnalysisTranslation();
  const localizeTimeClass = useLocalizeTimeClass();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const timeControl = formatTimeControl(game.timeControl);

  return (
    <header className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-2'>
        <Button variant='ghost' size='sm' asChild className='-ml-3'>
          <a href={toHref({ name: 'library' })}>
            <ArrowLeft />
            {t('Games')}
          </a>
        </Button>
        <div className='flex items-center gap-1'>
          {game.url && (
            <Tooltip content={t('OpenOriginalGame')}>
              <Button variant='ghost' size='iconSm' asChild>
                <a
                  href={game.url}
                  target='_blank'
                  rel='noreferrer'
                  aria-label={t('OpenOriginalGame')}
                >
                  <ExternalLink />
                </a>
              </Button>
            </Tooltip>
          )}
          <Tooltip content={t('ExportPgn')}>
            <Button
              variant='ghost'
              size='iconSm'
              aria-label={t('ExportPgn')}
              onClick={onExport}
            >
              <Download />
            </Button>
          </Tooltip>
          <Tooltip content={t('DeleteGame')}>
            <Button
              variant='ghost'
              size='iconSm'
              aria-label={t('DeleteGame')}
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 />
            </Button>
          </Tooltip>
        </div>
      </div>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div className='flex min-w-0 flex-col gap-2'>
          <h1 className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-semibold tracking-tight'>
            <PlayerName
              player={game.white}
              isUser={game.userColor === 'white'}
            />
            <span className='text-sm font-normal text-muted-foreground'>
              {t('Versus')}
            </span>
            <PlayerName
              player={game.black}
              isUser={game.userColor === 'black'}
            />
            <Badge variant='outline' className='font-mono'>
              {game.result}
            </Badge>
          </h1>
          <p className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground'>
            {game.opening && (
              <>
                {game.eco && (
                  <span className='font-mono text-xs'>{game.eco}</span>
                )}
                <span className='text-foreground'>{game.opening}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{formatDate(game.playedAt)}</span>
            <span aria-hidden>·</span>
            <span>{localizeTimeClass(game.timeClass)}</span>
            {timeControl && (
              <span className='font-mono text-xs'>{timeControl}</span>
            )}
          </p>
        </div>
        {children}
      </div>
      <DeleteGameDialog
        gameId={game.id}
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </header>
  );
};

const PlayerName: React.FC<PlayerNameProps> = ({ player, isUser }) => {
  const { t } = useAnalysisTranslation();

  return (
    <span className='flex items-center gap-1.5'>
      <span>{player.name}</span>
      {player.rating !== undefined && (
        <span className='font-mono text-sm font-normal text-muted-foreground'>
          {player.rating}
        </span>
      )}
      {isUser && <Badge variant='secondary'>{t('You')}</Badge>}
    </span>
  );
};

const DeleteGameDialog: React.FC<DeleteGameDialogProps> = ({
  gameId,
  isOpen,
  onOpenChange,
}) => {
  const { t } = useAnalysisTranslation();

  const handleDelete = async (): Promise<void> => {
    await deleteGame(gameId);
    navigate({ name: 'library' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('DeleteGameTitle')}</DialogTitle>
          <DialogDescription>{t('DeleteGameDescription')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button variant='destructive' onClick={handleDelete}>
            {t('DeleteGame')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
