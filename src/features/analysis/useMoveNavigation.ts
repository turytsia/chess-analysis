import { useEffect, useState } from 'react';

const IGNORED_TARGETS =
  'input, textarea, select, [contenteditable], [role="tablist"], [role="slider"], [role="listbox"], [role="dialog"], [role="application"]';

export interface MoveNavigation {
  ply: number;
  selectPly: (ply: number) => void;
}

export function useMoveNavigation(lastPly: number): MoveNavigation {
  const [ply, setPly] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const isIgnored =
        event.target instanceof Element &&
        event.target.closest(IGNORED_TARGETS) !== null;
      if (isIgnored || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const getNextPly = {
        ArrowLeft: (current: number) => current - 1,
        ArrowRight: (current: number) => current + 1,
        ArrowUp: () => 0,
        ArrowDown: () => lastPly,
        Home: () => 0,
        End: () => lastPly,
      }[event.key];
      if (getNextPly) {
        event.preventDefault();
        setPly((current) => clampPly(getNextPly(current), lastPly));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lastPly]);

  return {
    ply: clampPly(ply, lastPly),
    selectPly: (next) => setPly(clampPly(next, lastPly)),
  };
}

function clampPly(ply: number, lastPly: number): number {
  return Math.min(Math.max(ply, 0), lastPly);
}
