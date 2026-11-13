import { useState } from 'react';
import {
  Chessboard,
  type PieceDropHandlerArgs,
  type SquareHandlerArgs,
} from 'react-chessboard';

import type { PlayerColor } from '../services/evaluation';
import { getPieceColor } from '../services/notation';

const ANIMATION_DURATION_MS = 200;
const HIGHLIGHT_STRENGTH = '45%';
const SELECTED_SQUARE_COLOR = 'var(--label-great)';
const LIGHT_SQUARE_STYLE = { backgroundColor: 'var(--board-light)' } as const;
const DARK_SQUARE_STYLE = { backgroundColor: 'var(--board-dark)' } as const;
const LIGHT_NOTATION_STYLE = { color: 'var(--board-dark)' } as const;
const DARK_NOTATION_STYLE = { color: 'var(--board-light)' } as const;

export interface BoardArrow {
  from: string;
  to: string;
  color: string;
}

export interface SquareHighlight {
  square: string;
  color: string;
}

interface BoardProps {
  id: string;
  fen: string;
  orientation: PlayerColor;
  arrows?: Array<BoardArrow>;
  highlights?: Array<SquareHighlight>;
  movableColor?: PlayerColor;
  onMove?: (from: string, to: string) => boolean;
}

export const Board: React.FC<BoardProps> = ({
  id,
  fen,
  orientation,
  arrows = [],
  highlights = [],
  movableColor,
  onMove,
}) => {
  const [selection, setSelection] = useState<
    { square: string; fen: string } | undefined
  >();
  const selectedSquare = selection?.fen === fen ? selection.square : undefined;
  const isInteractive = movableColor !== undefined && onMove !== undefined;

  const handleDrop = ({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean => {
    setSelection(undefined);
    return (
      targetSquare !== null && (onMove?.(sourceSquare, targetSquare) ?? false)
    );
  };

  const handleSquareClick = ({ square }: SquareHandlerArgs): void => {
    if (!isInteractive) {
      return;
    }
    const isOwnPiece = getPieceColor(fen, square) === movableColor;
    if (selectedSquare && selectedSquare !== square) {
      const isMoved = onMove(selectedSquare, square);
      setSelection(!isMoved && isOwnPiece ? { square, fen } : undefined);
      return;
    }
    setSelection(
      selectedSquare === square || !isOwnPiece ? undefined : { square, fen }
    );
  };

  const squareStyles = Object.fromEntries(
    [
      ...highlights,
      ...(selectedSquare
        ? [{ square: selectedSquare, color: SELECTED_SQUARE_COLOR }]
        : []),
    ].map(({ square, color }) => [square, toHighlightStyle(color)])
  );

  return (
    <div className='aspect-square w-full overflow-hidden rounded-md border'>
      <Chessboard
        options={{
          id,
          position: fen,
          boardOrientation: orientation,
          animationDurationInMs: ANIMATION_DURATION_MS,
          allowDragging: isInteractive,
          canDragPiece: ({ piece }) =>
            isInteractive && piece.pieceType[0] === movableColor[0],
          onPieceDrop: handleDrop,
          onSquareClick: handleSquareClick,
          arrows: arrows.map(({ from, to, color }) => ({
            startSquare: from,
            endSquare: to,
            color,
          })),
          squareStyles,
          lightSquareStyle: LIGHT_SQUARE_STYLE,
          darkSquareStyle: DARK_SQUARE_STYLE,
          lightSquareNotationStyle: LIGHT_NOTATION_STYLE,
          darkSquareNotationStyle: DARK_NOTATION_STYLE,
        }}
      />
    </div>
  );
};

function toHighlightStyle(color: string): React.CSSProperties {
  return {
    boxShadow: `inset 0 0 0 999px color-mix(in oklab, ${color} ${HIGHLIGHT_STRENGTH}, transparent)`,
  };
}
