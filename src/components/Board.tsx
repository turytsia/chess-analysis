import { useState } from 'react';
import {
  Chessboard,
  type PieceDropHandlerArgs,
  type PieceHandlerArgs,
  type SquareHandlerArgs,
} from 'react-chessboard';

import type { MoveLabel } from '../services/classify';
import type { PlayerColor } from '../services/evaluation';
import { getLegalTargets, getPieceColor } from '../services/notation';
import { cn } from '../utilities/cn';
import { getLabelColor, MoveLabelIcon } from './MoveLabelIcon';

const ANIMATION_DURATION_MS = 200;
const BOARD_SIZE = 8;
const SQUARE_PERCENT = 100 / BOARD_SIZE;
const FIRST_FILE_CODE = 'a'.charCodeAt(0);
const PRIMARY_BUTTON = 0;
const HIGHLIGHT_STRENGTH = '45%';
const LAST_MOVE_COLOR = 'var(--board-highlight)';
const SELECTED_SQUARE_COLOR = 'var(--label-great)';
const LIGHT_SQUARE_STYLE = { backgroundColor: 'var(--board-light)' } as const;
const DARK_SQUARE_STYLE = { backgroundColor: 'var(--board-dark)' } as const;
const LIGHT_NOTATION_STYLE = { color: 'var(--board-dark)' } as const;
const DARK_NOTATION_STYLE = { color: 'var(--board-light)' } as const;
const MOVE_DOT_STYLE = {
  backgroundImage:
    'radial-gradient(circle, var(--board-move-hint) 19%, transparent 21%)',
} as const;
const CAPTURE_RING_STYLE = {
  backgroundImage:
    'radial-gradient(circle closest-side, transparent 78%, var(--board-move-hint) 80%, var(--board-move-hint) 98%, transparent 100%)',
} as const;

export interface BoardArrow {
  from: string;
  to: string;
  color: string;
}

interface BoardMove {
  from: string;
  to: string;
  label?: MoveLabel;
}

interface BoardProps {
  id: string;
  fen: string;
  orientation: PlayerColor;
  arrows?: Array<BoardArrow>;
  lastMove?: BoardMove;
  movableColor?: PlayerColor;
  onMove?: (from: string, to: string) => boolean;
}

interface Selection {
  square: string;
  fen: string;
  isFresh: boolean;
}

interface MoveLabelBadgeProps {
  square: string;
  label: MoveLabel;
  orientation: PlayerColor;
}

/*
 * A piece is selected as soon as it is pressed, so its legal moves show
 * before the mouse button is released. The click that ends that press must
 * not deselect it again, which is what `isFresh` is for: only a click on a
 * piece that was already selected before the press deselects it.
 */
export const Board: React.FC<BoardProps> = ({
  id,
  fen,
  orientation,
  arrows = [],
  lastMove,
  movableColor,
  onMove,
}) => {
  const [selection, setSelection] = useState<Selection | undefined>();
  const selectedSquare = selection?.fen === fen ? selection.square : undefined;
  const isInteractive = movableColor !== undefined && onMove !== undefined;

  const handleDrop = ({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean => {
    if (targetSquare === sourceSquare) {
      return false;
    }
    setSelection(undefined);
    return (
      targetSquare !== null && (onMove?.(sourceSquare, targetSquare) ?? false)
    );
  };

  const handlePieceDrag = ({ square }: PieceHandlerArgs): void => {
    if (square && square !== selectedSquare) {
      setSelection({ square, fen, isFresh: false });
    }
  };

  const handleSquareMouseDown = (
    { square }: SquareHandlerArgs,
    event: React.MouseEvent
  ): void => {
    const isOwnPiece =
      isInteractive && getPieceColor(fen, square) === movableColor;
    if (
      event.button === PRIMARY_BUTTON &&
      isOwnPiece &&
      square !== selectedSquare
    ) {
      setSelection({ square, fen, isFresh: true });
    }
  };

  const handleSquareClick = ({ square }: SquareHandlerArgs): void => {
    if (!isInteractive) {
      return;
    }
    if (selectedSquare === square) {
      setSelection(
        selection?.isFresh ? { square, fen, isFresh: false } : undefined
      );
      return;
    }
    const isOwnPiece = getPieceColor(fen, square) === movableColor;
    const isMoved =
      selectedSquare !== undefined && onMove(selectedSquare, square);
    setSelection(
      !isMoved && isOwnPiece ? { square, fen, isFresh: false } : undefined
    );
  };

  const lastMoveColor = lastMove?.label
    ? getLabelColor(lastMove.label)
    : LAST_MOVE_COLOR;
  const squareStyles = [
    ...(lastMove ? [lastMove.from, lastMove.to] : []).map((square) => ({
      square,
      style: toHighlightStyle(lastMoveColor),
    })),
    ...(selectedSquare
      ? [
          {
            square: selectedSquare,
            style: toHighlightStyle(SELECTED_SQUARE_COLOR),
          },
          ...getLegalTargets(fen, selectedSquare).map(
            ({ square, isOccupied }) => ({
              square,
              style: isOccupied ? CAPTURE_RING_STYLE : MOVE_DOT_STYLE,
            })
          ),
        ]
      : []),
  ].reduce<Record<string, React.CSSProperties>>(
    (styles, { square, style }) => ({
      ...styles,
      [square]: { ...styles[square], ...style },
    }),
    {}
  );

  return (
    <div className='relative aspect-square w-full overflow-hidden rounded-md border'>
      <Chessboard
        options={{
          id,
          position: fen,
          boardOrientation: orientation,
          animationDurationInMs: ANIMATION_DURATION_MS,
          allowDragging: isInteractive,
          canDragPiece: ({ piece }) =>
            isInteractive && piece.pieceType[0] === movableColor[0],
          onPieceDrag: handlePieceDrag,
          onPieceDrop: handleDrop,
          onSquareMouseDown: handleSquareMouseDown,
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
      {lastMove?.label && (
        <MoveLabelBadge
          square={lastMove.to}
          label={lastMove.label}
          orientation={orientation}
        />
      )}
    </div>
  );
};

const MoveLabelBadge: React.FC<MoveLabelBadgeProps> = ({
  square,
  label,
  orientation,
}) => {
  const { column, row } = getSquareOffsets(square, orientation);

  return (
    <div
      className='pointer-events-none absolute z-30 @container size-[12.5%]'
      style={{
        left: `${column * SQUARE_PERCENT}%`,
        top: `${row * SQUARE_PERCENT}%`,
      }}
    >
      <MoveLabelIcon
        label={label}
        className={cn(
          'absolute size-[40cqw] text-[21cqw] shadow-[0_1px_3px_rgb(0_0_0/0.5)] [&>svg]:size-[58%]',
          row === 0 ? 'top-[4cqw]' : '-top-[12cqw]',
          column === BOARD_SIZE - 1 ? 'right-[4cqw]' : '-right-[12cqw]'
        )}
      />
    </div>
  );
};

function toHighlightStyle(color: string): React.CSSProperties {
  return {
    boxShadow: `inset 0 0 0 999px color-mix(in oklab, ${color} ${HIGHLIGHT_STRENGTH}, transparent)`,
  };
}

function getSquareOffsets(
  square: string,
  orientation: PlayerColor
): { column: number; row: number } {
  const file = square.charCodeAt(0) - FIRST_FILE_CODE;
  const rank = Number(square[1]) - 1;
  return orientation === 'white'
    ? { column: file, row: BOARD_SIZE - 1 - rank }
    : { column: BOARD_SIZE - 1 - file, row: rank };
}
