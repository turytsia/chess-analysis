import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';

import { AppHeader } from './components/AppHeader';
import { TooltipProvider } from './components/ui/Tooltip';
import { GameLibrary } from './features/library/GameLibrary';
import { useRoute, type Route } from './utilities/router';

const AnalysisView = lazy(() =>
  import('./features/analysis/AnalysisView').then((module) => ({
    default: module.AnalysisView,
  }))
);

interface PageProps {
  route: Route;
}

export const App: React.FC = () => {
  const route = useRoute();

  return (
    <TooltipProvider>
      <div className='flex min-h-dvh flex-col'>
        <AppHeader />
        <main className='mx-auto w-full max-w-7xl flex-1 px-4 py-(--page-gutter) sm:px-6'>
          <Suspense>
            <Page route={route} />
          </Suspense>
        </main>
      </div>
      <Toaster
        position='bottom-right'
        toastOptions={{
          classNames: {
            toast:
              'rounded-lg! border! border-border! bg-popover! text-popover-foreground! shadow-lg!',
            description: 'text-muted-foreground!',
          },
        }}
      />
    </TooltipProvider>
  );
};

const Page: React.FC<PageProps> = ({ route }) => {
  if (route.name === 'game') {
    return <AnalysisView gameId={route.gameId} />;
  }
  return <GameLibrary />;
};
