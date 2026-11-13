import { use, useState } from 'react';

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
import { DrillOverview } from './DrillOverview';
import { DrillSession } from './DrillSession';
import { GameDeviations } from './GameDeviations';

interface OpeningTrainerProps {
  view: TrainerView;
}

export const OpeningTrainer: React.FC<OpeningTrainerProps> = ({ view }) => {
  const { t } = useTrainerTranslation();
  const book = use(loadCaroKannBook());
  const [browsePath, setBrowsePath] = useState<Array<string>>([]);
  const [session, setSession] = useState<{
    id: number;
    queue: Array<Opening>;
  }>({ id: 0, queue: [] });

  const startSession = (queue: Array<Opening>): void => {
    setSession({ id: session.id + 1, queue });
    navigate({ name: 'trainer', view: 'drill' });
  };

  return (
    <div className='flex flex-col gap-6'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {t('OpeningTrainer')}
        </h1>
        <p className='text-sm text-muted-foreground'>
          {t('TrainerSubtitle', { count: book.openings.length })}
        </p>
      </header>
      <Tabs
        value={view}
        onValueChange={(value) =>
          navigate({ name: 'trainer', view: toTrainerView(value) })
        }
      >
        <TabsList>
          <TabsTrigger value='browse'>{t('Browse')}</TabsTrigger>
          <TabsTrigger value='drill'>{t('Drill')}</TabsTrigger>
          <TabsTrigger value='games'>{t('MyGames')}</TabsTrigger>
        </TabsList>
        <TabsContent value='browse'>
          <BrowseMode
            book={book}
            path={browsePath}
            onPathChange={setBrowsePath}
            onPractice={startSession}
          />
        </TabsContent>
        <TabsContent value='drill'>
          {session.queue.length > 0 ? (
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
              setBrowsePath(path);
              navigate({ name: 'trainer', view: 'browse' });
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
