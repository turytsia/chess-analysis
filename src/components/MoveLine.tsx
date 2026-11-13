import { useEffect, useRef } from 'react';

import { cn } from '../utilities/cn';
import { formatMoveNumber } from '../utilities/format';
import { scrollWithin } from '../utilities/scrollWithin';

interface MoveLineProps {
  sans: Array<string>;
  firstPly: number;
  cursor: number;
  onSelectCursor: (cursor: number) => void;
  'aria-label': string;
}

export const MoveLine: React.FC<MoveLineProps> = ({
  sans,
  firstPly,
  cursor,
  onSelectCursor,
  'aria-label': ariaLabel,
}) => {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector('[aria-current="true"]');
    if (list && active instanceof HTMLElement) {
      scrollWithin(list, active);
    }
  }, [cursor, sans.length]);

  return (
    <ol
      ref={listRef}
      aria-label={ariaLabel}
      className='relative flex max-h-[3.25rem] min-w-0 flex-wrap items-center gap-x-1 gap-y-1 overflow-y-auto text-sm'
    >
      {sans.map((san, index) => {
        const ply = firstPly + index;
        const isActive = index + 1 === cursor;

        return (
          <li key={index} className='flex items-center gap-1'>
            {(index === 0 || ply % 2 === 1) && (
              <span className='font-mono text-xs text-muted-foreground tabular-nums'>
                {formatMoveNumber(ply)}
              </span>
            )}
            <button
              type='button'
              aria-current={isActive}
              onClick={() => onSelectCursor(index + 1)}
              className={cn(
                'h-6 cursor-pointer rounded-md px-1.5 font-medium outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
                isActive &&
                  'bg-primary text-primary-foreground hover:bg-primary',
                index >= cursor && 'text-muted-foreground'
              )}
            >
              {san}
            </button>
          </li>
        );
      })}
    </ol>
  );
};
