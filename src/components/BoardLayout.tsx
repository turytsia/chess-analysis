import { cn } from '../utilities/cn';

const BOARD_SIZE =
  'lg:[--board-size:min(100cqh,calc(100cqw_-_var(--panel-width)_-_1.5rem_-_var(--board-bar)_-_var(--board-tools)))]';

interface BoardLayoutProps {
  board: React.ReactNode;
  evalBar?: React.ReactNode;
  tools?: React.ReactNode;
  controls?: React.ReactNode;
  children: React.ReactNode;
}

/*
 * On large screens the board and the side panel form one centered group of
 * equal height: the board is the largest square that fits the space after the
 * panel, the eval bar and the tool strip take their width, and the panel is
 * exactly as tall as the board. Panel content scrolls inside it and the
 * controls stay pinned to its bottom edge. The outer element is a size
 * container so that this can be expressed in container units. On small screens
 * everything stacks: the board, then the tools and controls, then the panel.
 */
export const BoardLayout: React.FC<BoardLayoutProps> = ({
  board,
  evalBar,
  tools,
  controls,
  children,
}) => (
  <div className='lg:h-full lg:min-h-0 lg:flex-1 lg:[container-type:size]'>
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)] gap-4 [--panel-width:27rem]',
        'lg:mx-auto lg:h-(--board-size) lg:w-fit lg:grid-cols-[auto_var(--panel-width)] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-x-6 lg:gap-y-3',
        evalBar ? '[--board-bar:2.5rem]' : '[--board-bar:0rem]',
        tools ? '[--board-tools:2.75rem]' : '[--board-tools:0rem]',
        BOARD_SIZE
      )}
    >
      <div className='flex gap-2 lg:row-span-2'>
        {evalBar}
        <div className='min-w-0 flex-1 lg:w-(--board-size) lg:flex-none'>
          {board}
        </div>
        {tools && <div className='hidden flex-col gap-1 lg:flex'>{tools}</div>}
      </div>
      {(tools || controls) && (
        <div className='flex flex-col gap-2 lg:col-start-2 lg:row-start-2'>
          {tools && (
            <div className='flex justify-end gap-1 lg:hidden'>{tools}</div>
          )}
          {controls}
        </div>
      )}
      <div
        className={cn(
          'flex min-h-0 flex-col gap-4 lg:col-start-2 lg:row-start-1 lg:overflow-y-auto',
          !controls && 'lg:row-span-2'
        )}
      >
        {children}
      </div>
    </div>
  </div>
);
