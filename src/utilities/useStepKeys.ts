import { useEffect, useRef } from 'react';

const IGNORED_TARGETS =
  'input, textarea, select, [contenteditable], [role="tablist"], [role="slider"], [role="listbox"], [role="dialog"], [role="application"]';
const KEY_STEPS: Partial<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -Infinity,
  ArrowDown: Infinity,
  Home: -Infinity,
  End: Infinity,
};
const ESCAPE_KEY = 'Escape';

interface StepKeyHandlers {
  onStep: (delta: number) => void;
  onEscape?: () => void;
}

export function useStepKeys(handlers: StepKeyHandlers): void {
  const latestHandlers = useRef(handlers);

  useEffect(() => {
    latestHandlers.current = handlers;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const isIgnored =
        event.target instanceof Element &&
        event.target.closest(IGNORED_TARGETS) !== null;
      if (isIgnored || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const delta = KEY_STEPS[event.key];
      if (delta !== undefined) {
        event.preventDefault();
        latestHandlers.current.onStep(delta);
      }
      if (event.key === ESCAPE_KEY) {
        latestHandlers.current.onEscape?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
