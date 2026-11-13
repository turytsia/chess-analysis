import { cn } from '../utilities/cn';

const VIEWPORT_FIT =
  'lg:h-[calc(100dvh_-_var(--header-height)_-_2_*_var(--page-gutter))]';

interface BoardPageProps {
  fitsViewport: boolean;
  children: React.ReactNode;
}

export const BoardPage: React.FC<BoardPageProps> = ({
  fitsViewport,
  children,
}) => (
  <div className={cn('flex flex-col gap-4', fitsViewport && VIEWPORT_FIT)}>
    {children}
  </div>
);
