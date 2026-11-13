import { useState } from 'react';

import { useStepKeys } from '../../utilities/useStepKeys';
import {
  canStep,
  getDisplayedFen,
  isExploring,
  playMove,
  selectCursor,
  selectPly,
  step,
  type GameLine,
  type NavigationState,
} from './exploration';

const FIRST_SHOWN_PLY = 1;

interface GameNavigation extends NavigationState {
  fen: string;
  isExploring: boolean;
  canStepBack: boolean;
  canStepForward: boolean;
  selectPly: (ply: number) => void;
  selectCursor: (cursor: number) => void;
  step: (delta: number) => void;
  playMove: (from: string, to: string) => boolean;
  resetExploration: () => void;
}

export function useGameNavigation(game: GameLine): GameNavigation {
  const lastPly = game.moves.length;
  const [state, setState] = useState(() => selectPly(FIRST_SHOWN_PLY, lastPly));

  useStepKeys({
    onStep: (delta) => setState((current) => step(current, delta, lastPly)),
    onEscape: () => setState((current) => selectPly(current.ply, lastPly)),
  });

  return {
    ...state,
    fen: getDisplayedFen(state, game.positions),
    isExploring: isExploring(state),
    canStepBack: canStep(state, -1, lastPly),
    canStepForward: canStep(state, 1, lastPly),
    selectPly: (ply) => setState(selectPly(ply, lastPly)),
    selectCursor: (cursor) => setState(selectCursor(state, cursor)),
    step: (delta) => setState(step(state, delta, lastPly)),
    playMove: (from, to) => {
      const next = playMove(state, game, from, to);
      if (next) {
        setState(next);
      }
      return next !== undefined;
    },
    resetExploration: () => setState(selectPly(state.ply, lastPly)),
  };
}
