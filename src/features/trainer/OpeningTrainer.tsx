import { use, useState } from 'react';

import { BoardPage } from '../../components/BoardPage';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/Tabs';
import { loadCaroKannBook, type Opening } from '../../services/openings';
import { useTrainerTranslation } from '../../translations/hooks';
import {
  navigate,
  toTrainerView,
  type TrainerView,
} from '../../utilities/router';
import { BrowseMode } from './BrowseMode';
import { EMPTY_LINE, openLine } from './browseLine';
import { DrillOverview } from './DrillOverview';
import { DrillSession } from './DrillSession';
import { GameDeviations } from './GameDeviations';

interface OpeningTrainerProps {
  view: TrainerView;
}

export const OpeningTrainer: React.FC<OpeningTrainerProps> = ({ view }) => {
  const { t } = useTrainerTranslation();
  const book = use(loadCaroKannBook());
  const [browseLine, setBrowseLine] = useState(EMPTY_LINE);
  const [session, setSession] = useState<{
    id: number;
    queue: Array<Opening>;
  }>({ id: 0, queue: [] });
  const isDrilling = session.queue.length > 0;

  const startSession = (queue: Array<Opening>): void => {
    setSession({ id: session.id + 1, queue });
    navigate({ name: 'trainer', view: 'drill' });
  };

  return (
    <BoardPage
      fitsViewport={view === 'browse' || (view === 'drill' && isDrilling)}
    >
      <Tabs
        value={view}
        className='lg:min-h-0 lg:flex-1'
        onValueChange={(value) =>
          navigate({ name: 'trainer', view: toTrainerView(value) })
        }
      >
        <header className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2'>
          <div className='flex min-w-0 flex-wrap items-baseline gap-x-3'>
            <h1 className='text-lg font-semibold tracking-tight'>
              {t('OpeningTrainer')}
            </h1>
            <p className='text-sm text-muted-foreground'>
              {t('TrainerSubtitle', { count: book.openings.length })}
            </p>
          </div>
          <TabsList>
            <TabsTrigger value='browse'>{t('Browse')}</TabsTrigger>
            <TabsTrigger value='drill'>{t('Drill')}</TabsTrigger>
            <TabsTrigger value='games'>{t('MyGames')}</TabsTrigger>
          </TabsList>
        </header>
        <TabsContent value='browse' className='lg:min-h-0'>
          <BrowseMode
            book={book}
            line={browseLine}
            onLineChange={setBrowseLine}
            onPractice={startSession}
          />
        </TabsContent>
        <TabsContent value='drill' className='lg:min-h-0'>
          {isDrilling ? (
            <DrillSession
              key={session.id}
              queue={session.queue}
              book={book}
              onFinish={() => setSession({ ...session, queue: [] })}
            />
          ) : (
            <DrillOverview book={book} onStart={startSession} />
          )}
        </TabsContent>
        <TabsContent value='games'>
          <GameDeviations
            book={book}
            onPractice={startSession}
            onExplore={(path) => {
              setBrowseLine(openLine(path));
              navigate({ name: 'trainer', view: 'browse' });
            }}
          />
        </TabsContent>
      </Tabs>
    </BoardPage>
  );
};
