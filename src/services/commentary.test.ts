import { describe, expect, it } from 'vitest';

import { assessMoves } from './classify';
import { describeMove, type MoveRemark } from './commentary';
import type { PositionEval } from './evaluation';
import { parsePgn } from './pgn';

interface RemarkCase {
  pgn: string;
  before: PositionEval;
  after: PositionEval;
  beforePreviousMove?: PositionEval;
  bookPlies?: number;
}

function lineOf(cp: number, ...pv: Array<string>): PositionEval {
  return { lines: [{ cp, depth: 16, pv }] };
}

function mateOf(mate: number, ...pv: Array<string>): PositionEval {
  return { lines: [{ mate, depth: 16, pv }] };
}

function fromFen(fen: string, movetext: string): string {
  return `[SetUp "1"]\n[FEN "${fen}"]\n\n${movetext} *`;
}

function remarksOf({
  pgn,
  before,
  after,
  beforePreviousMove,
  bookPlies = 0,
}: RemarkCase): Array<MoveRemark> {
  const { moves } = parsePgn(pgn);
  const index = moves.length - 1;
  const evals: Array<PositionEval | undefined> = [
    ...moves.slice(0, index - 1).map(() => undefined),
    ...(index > 0 ? [beforePreviousMove] : []),
    before,
    after,
  ];
  const assessment = assessMoves({ moves, evals, bookPlies })[index];
  if (!assessment) {
    throw new Error('The move could not be assessed');
  }
  return describeMove({
    move: moves[index],
    previousMove: moves[index - 1],
    assessment,
    before,
    after,
  });
}

describe('describeMove', () => {
  describe('results', () => {
    it('should announce a checkmate', () => {
      expect(
        remarksOf({
          pgn: '1. f3 e5 2. g4 Qh4# *',
          before: mateOf(-1, 'd8h4'),
          after: { lines: [], outcome: 'blackWins' },
        })
      ).toEqual([{ kind: 'checkmate' }]);
    });

    it('should explain a stalemate', () => {
      expect(
        remarksOf({
          pgn: fromFen('7k/8/6K1/8/8/8/8/5Q2 w - - 0 1', '1. Qf7'),
          before: mateOf(2, 'f1f8'),
          after: { lines: [], outcome: 'draw' },
        })
      ).toEqual([{ kind: 'stalemate' }]);
    });
  });

  describe('good moves', () => {
    it('should describe a book move by what it does', () => {
      expect(
        remarksOf({
          pgn: '1. e4 *',
          before: lineOf(30, 'e2e4'),
          after: lineOf(30, 'e7e5'),
          bookPlies: 1,
        })
      ).toEqual([{ kind: 'bookMove' }, { kind: 'takesCenter', square: 'e4' }]);
    });

    it('should notice a piece being developed', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 *',
          before: lineOf(30, 'g1f3'),
          after: lineOf(30, 'b8c6'),
        })
      ).toEqual([{ kind: 'develops', piece: 'n', square: 'f3' }]);
    });

    it('should notice castling', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O *',
          before: lineOf(30, 'e1g1'),
          after: lineOf(30, 'g8f6'),
        })
      ).toEqual([{ kind: 'castles', side: 'kingside' }]);
    });

    it('should notice a piece that is won for nothing', () => {
      expect(
        remarksOf({
          pgn: fromFen('4k3/8/8/3n4/8/8/3R4/4K3 w - - 0 1', '1. Rxd5'),
          before: lineOf(500, 'd2d5'),
          after: lineOf(500, 'e8e7'),
        })
      ).toEqual([{ kind: 'winsPiece', piece: 'n' }]);
    });

    it('should notice a piece being taken back', () => {
      expect(
        remarksOf({
          pgn: '1. e4 d5 2. exd5 Qxd5 *',
          before: lineOf(40, 'd8d5'),
          after: lineOf(40, 'b1c3'),
        })
      ).toEqual([{ kind: 'takesBack', square: 'd5' }]);
    });

    it('should notice an even trade', () => {
      expect(
        remarksOf({
          pgn: '1. d4 Nf6 2. Bg5 e6 3. Bxf6 *',
          before: lineOf(20, 'g5f6'),
          after: lineOf(20, 'd8f6'),
        })
      ).toEqual([{ kind: 'trades', given: 'b', taken: 'n', square: 'f6' }]);
    });

    it('should notice a fork of the king and a rook', () => {
      expect(
        remarksOf({
          pgn: fromFen('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', '1. Nc7+'),
          before: lineOf(300, 'd5c7'),
          after: lineOf(300, 'e8d7', 'c7a8'),
        })
      ).toEqual([{ kind: 'forks', first: 'k', second: 'r' }]);
    });

    it('should notice an attacked piece moving away', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 *',
          before: lineOf(30, 'b5a4'),
          after: lineOf(30, 'g8f6'),
        })
      ).toEqual([{ kind: 'savesPiece', piece: 'b' }]);
    });

    it('should notice an attacked piece being protected', () => {
      expect(
        remarksOf({
          pgn: fromFen('4r1k1/8/8/4N3/8/8/3P4/4K3 w - - 0 1', '1. d4'),
          before: lineOf(100, 'd2d4'),
          after: lineOf(100, 'g8g7'),
        })
      ).toEqual([{ kind: 'defendsPiece', piece: 'n', square: 'e5' }]);
    });

    it('should notice a new attack on a piece', () => {
      expect(
        remarksOf({
          pgn: fromFen('r3k3/8/8/8/8/8/8/4KB2 w - - 0 1', '1. Bg2'),
          before: lineOf(-200, 'f1g2'),
          after: lineOf(-200, 'a8a1'),
        })
      ).toEqual([{ kind: 'threatens', piece: 'r', square: 'a8' }]);
    });

    it('should name the sacrificed piece of a Brilliant move', () => {
      expect(
        remarksOf({
          pgn: fromFen('6k1/5ppp/8/8/8/3B4/5PPP/6K1 w - - 0 1', '1. Bxh7+'),
          before: {
            lines: [
              { cp: 60, depth: 16, pv: ['d3h7'] },
              { cp: 0, depth: 16, pv: ['g1f1'] },
            ],
          },
          after: lineOf(60, 'g8h7'),
        })
      ).toEqual([{ kind: 'sacrifice', piece: 'b' }, { kind: 'givesCheck' }]);
    });

    it('should say that a Great move was the only one', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O *',
          before: {
            lines: [
              { cp: 0, depth: 16, pv: ['e1g1'] },
              { cp: -200, depth: 16, pv: ['d2d3'] },
            ],
          },
          after: lineOf(0, 'g8f6'),
        })
      ).toEqual([
        { kind: 'onlyGoodMove' },
        { kind: 'castles', side: 'kingside' },
      ]);
    });

    it('should announce a forced checkmate', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 *',
          before: lineOf(-50, 'g7g6'),
          after: mateOf(1, 'h5f7'),
        })[0]
      ).toEqual({ kind: 'allowsMate', moves: 1 });
    });

    it('should say when there was no other legal move', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 *',
          before: mateOf(1, 'e8e7', 'c3d5'),
          after: mateOf(1, 'c3d5'),
        })
      ).toEqual([{ kind: 'forcedMove' }]);
    });

    it('should not call a capture a win when the engine line gives it back', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Bd7 6. Bd3 Nge7 7. O-O Ng6 8. Be3 Be7 9. dxc5 *',
          before: lineOf(30, 'd4c5'),
          after: lineOf(25, 'g6e5', 'f3e5', 'c6e5'),
        })
      ).toEqual([{ kind: 'takesPiece', piece: 'p', square: 'c5' }]);
    });

    it('should not read a threat into a reply to a check', () => {
      expect(
        remarksOf({
          pgn: '1. e4 d5 2. Bb5+ c6 *',
          before: lineOf(-60, 'c7c6'),
          after: lineOf(-60, 'b5e2'),
        })
      ).toEqual([{ kind: 'escapesCheck' }]);
    });

    it('should add the stronger idea to a move that is only Good', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. h3 *',
          before: lineOf(40, 'e1g1'),
          after: lineOf(0, 'g8f6'),
        })
      ).toEqual([
        { kind: 'goodMove' },
        { kind: 'strongerPlan', plan: { kind: 'castles', side: 'kingside' } },
      ]);
    });

    it('should not repeat an idea that the stronger move shares', () => {
      expect(
        remarksOf({
          pgn: fromFen('4k3/8/8/3p3p/8/8/3R3R/4K3 w - - 0 1', '1. Rxh5'),
          before: lineOf(600, 'd2d5', 'e8e7'),
          after: lineOf(480, 'e8e7'),
        })
      ).toEqual([{ kind: 'winsPawn' }]);
    });

    it('should say so when a Good move has nothing more to tell', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. h3 *',
          before: lineOf(40, 'c2c3'),
          after: lineOf(0, 'g8f6'),
        })
      ).toEqual([{ kind: 'goodButNotBest' }]);
    });

    it('should not praise a threat made by a piece that can be taken', () => {
      expect(
        remarksOf({
          pgn: fromFen('6k1/r7/8/7Q/8/8/5PPP/1R4K1 b - - 0 1', '1... Rb7'),
          before: lineOf(900, 'a7a8'),
          after: lineOf(950, 'b1b7'),
        })
      ).toEqual([{ kind: 'excellentMove' }]);
    });

    it('should fall back to how the move compares with the best one', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. h3 *',
          before: lineOf(30, 'c2c3'),
          after: lineOf(20, 'g8f6'),
        })
      ).toEqual([{ kind: 'excellentMove' }]);
    });
  });

  describe('weak moves', () => {
    it('should point at a checkmate that the move allows', () => {
      expect(
        remarksOf({
          pgn: '1. f3 e5 2. g4 *',
          before: lineOf(-40, 'e2e4'),
          after: mateOf(-1, 'd8h4'),
        })
      ).toEqual([{ kind: 'allowsMate', moves: 1 }]);
    });

    it('should point at a checkmate that was missed', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qf3 *',
          before: mateOf(1, 'h5f7'),
          after: lineOf(60, 'd7d6'),
        })
      ).toEqual([{ kind: 'missedMate', moves: 1 }]);
    });

    it('should say that the moved piece can be taken', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Nxe5 *',
          before: lineOf(30, 'f1b5', 'a7a6'),
          after: lineOf(-250, 'c6e5', 'd2d4', 'e5c6'),
        })
      ).toEqual([{ kind: 'hangsMovedPiece', piece: 'n', square: 'e5' }]);
    });

    it('should say which piece is left to be taken', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. O-O *',
          before: lineOf(30, 'b5a4', 'g8f6'),
          after: lineOf(-280, 'a6b5', 'd2d4'),
        })
      ).toEqual([{ kind: 'leavesPieceHanging', piece: 'b', square: 'b5' }]);
    });

    it('should name the reply that wins a piece a few moves later', () => {
      expect(
        remarksOf({
          pgn: fromFen('r3k3/7p/8/3N4/8/8/8/4K3 b - - 0 1', '1... h6'),
          before: lineOf(-150, 'a8c8', 'e1d2'),
          after: lineOf(300, 'd5c7', 'e8d7', 'c7a8'),
        })
      ).toEqual([{ kind: 'losesPieceAfter', piece: 'r', reply: 'Nc7+' }]);
    });

    it('should notice a piece that was not taken back', () => {
      expect(
        remarksOf({
          pgn: '1. e4 d5 2. exd5 Nf6 *',
          before: lineOf(20, 'd8d5', 'b1c3'),
          after: lineOf(90, 'c2c4', 'e7e6'),
        })
      ).toEqual([{ kind: 'missedRecapture', piece: 'p' }]);
    });

    it('should notice a piece that could have been won', () => {
      expect(
        remarksOf({
          pgn: fromFen('4k3/8/8/3n4/8/8/3R4/4K3 w - - 0 1', '1. Ke2'),
          before: lineOf(500, 'd2d5', 'e8e7'),
          after: lineOf(200, 'd5f4', 'e2e3', 'f4e6'),
        })
      ).toEqual([{ kind: 'missedPiece', piece: 'n' }]);
    });

    it('should name the piece that is taken at once even when more is lost later', () => {
      expect(
        remarksOf({
          pgn: fromFen('r3k3/8/8/8/8/8/8/R3KQ2 w - - 0 1', '1. Qf8+'),
          before: lineOf(600, 'a1a8', 'e8e7'),
          after: lineOf(-900, 'e8f8', 'e1d2', 'a8a1'),
        })
      ).toEqual([{ kind: 'hangsMovedPiece', piece: 'q', square: 'f8' }]);
    });

    it('should say what a piece is given up for', () => {
      expect(
        remarksOf({
          pgn: fromFen('r3k3/8/8/8/8/8/8/R3KQ2 w - - 0 1', '1. Qf8+'),
          before: lineOf(600, 'a1a8', 'e8e7'),
          after: lineOf(100, 'e8f8', 'a1a8', 'f8e7'),
        })
      ).toEqual([{ kind: 'losesPieceFor', lost: 'q', won: 'r' }]);
    });

    it('should call it a lost pawn when pieces are only traded on the way', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 *',
          before: lineOf(30, 'g8f6'),
          after: lineOf(250, 'f3e5', 'd6e5', 'd1g4'),
        })
      ).toEqual([{ kind: 'losesPawn' }]);
    });

    it('should notice a king move that gives up castling', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Ke2 *',
          before: lineOf(30, 'g1f3'),
          after: lineOf(-40, 'g8f6'),
        })
      ).toEqual([
        { kind: 'givesUpCastling' },
        {
          kind: 'strongerPlan',
          plan: { kind: 'develops', piece: 'n', square: 'f3' },
        },
      ]);
    });

    it('should name the reply when nothing more is known about a mistake', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O *',
          before: lineOf(60, 'c2c3'),
          after: lineOf(-50, 'g8f6'),
        })
      ).toEqual([{ kind: 'allowsMove', reply: 'Nf6' }]);
    });

    it('should not call a sacrifice the engine recommends a loss', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. h3 *',
          before: lineOf(60, 'c4f7', 'e8f7', 'f3g5'),
          after: lineOf(-10, 'g8f6'),
        })
      ).toEqual([{ kind: 'allowsMove', reply: 'Nf6' }]);
    });

    it('should add the idea of the stronger move to the reply', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Nc3 *',
          before: lineOf(40, 'f1b5'),
          after: lineOf(-40, 'g8f6'),
        })
      ).toEqual([
        { kind: 'allowsMove', reply: 'Nf6' },
        {
          kind: 'strongerPlan',
          plan: { kind: 'develops', piece: 'b', square: 'b5' },
        },
      ]);
    });

    it('should say what the reply to a weak move does', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 *',
          before: lineOf(40, 'f1c4'),
          after: lineOf(-40, 'a7a6', 'b5a4'),
        })
      ).toEqual([
        {
          kind: 'allows',
          reply: 'a6',
          idea: { kind: 'threatens', piece: 'b', square: 'b5' },
        },
      ]);
    });

    it('should find a fork that comes a few moves into the reply line', () => {
      expect(
        remarksOf({
          pgn: fromFen(
            'r3kb1r/pppq1ppp/2n2n2/3ppb2/7N/2NP2P1/PPP1PPBP/R1BQ1RK1 b kq - 0 1',
            '1... O-O-O'
          ),
          before: lineOf(-20, 'f5h3'),
          after: lineOf(
            250,
            'h4f5',
            'd7f5',
            'c3d5',
            'f6d5',
            'e2e4',
            'f5e6',
            'e4d5'
          ),
        })
      ).toEqual([
        {
          kind: 'allows',
          first: 'Nxf5',
          reply: 'e4',
          idea: { kind: 'forks', first: 'q', second: 'n' },
        },
      ]);
    });

    it('should find the fork even when it is the fourth move of the line', () => {
      expect(
        remarksOf({
          pgn: fromFen(
            'r3kb1r/pppq1ppp/2n2n2/3ppb2/7N/2NP2P1/PPP1PPBP/R1BQ1RK1 b kq - 0 1',
            '1... O-O-O'
          ),
          before: lineOf(-20, 'f5h3'),
          after: lineOf(
            250,
            'h4f5',
            'd7f5',
            'c3d5',
            'd8d5',
            'g2d5',
            'f6d5',
            'e2e4',
            'f5d7',
            'e4d5',
            'd7d5'
          ),
        })
      ).toEqual([
        {
          kind: 'allows',
          first: 'Nxf5',
          reply: 'e4',
          idea: { kind: 'forks', first: 'q', second: 'n' },
        },
      ]);
    });

    it('should not call a piece lost when it is traded and another one falls', () => {
      expect(
        remarksOf({
          pgn: fromFen('r3k3/1b5p/8/7n/8/8/6P1/R3K3 b - - 0 1', '1... h6'),
          before: lineOf(0, 'h5f6'),
          after: lineOf(350, 'a1a8', 'b7a8', 'g2g4', 'e8d7', 'g4h5'),
        })
      ).toEqual([{ kind: 'losesPieceAfter', piece: 'n', reply: 'Rxa8+' }]);
    });

    it('should look further along the line for a piece lost by a blunder', () => {
      expect(
        remarksOf({
          pgn: fromFen('n3k3/4b2p/8/8/8/3P4/8/4RK2 b - - 0 1', '1... h6'),
          before: lineOf(-50, 'e8d7'),
          after: lineOf(
            300,
            'f1f2',
            'a8b6',
            'd3d4',
            'b6a8',
            'd4d5',
            'a8b6',
            'd5d6',
            'b6a8',
            'd6e7'
          ),
        })
      ).toEqual([{ kind: 'losesPiece', piece: 'b' }]);
    });

    it('should say what a quiet reply does when the move made it possible', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. d4 *',
          before: lineOf(40, 'f1b5'),
          after: lineOf(-40, 'e5d4', 'f3d4'),
        })
      ).toEqual([
        {
          kind: 'allows',
          reply: 'exd4',
          idea: { kind: 'tradesPieces', piece: 'p', square: 'd4' },
        },
        {
          kind: 'strongerPlan',
          plan: { kind: 'develops', piece: 'b', square: 'b5' },
        },
      ]);
    });

    it('should say what the stronger move would have done', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. h3 *',
          before: lineOf(120, 'e1g1'),
          after: lineOf(20, 'g8f6'),
        })
      ).toEqual([
        { kind: 'allowsMove', reply: 'Nf6' },
        { kind: 'strongerPlan', plan: { kind: 'castles', side: 'kingside' } },
      ]);
    });

    it('should name the pawn that is left to be taken', () => {
      expect(
        remarksOf({
          pgn: fromFen('4k3/8/8/3p4/8/8/3R4/4K3 b - - 0 1', '1... Ke7'),
          before: lineOf(400, 'd5d4'),
          after: lineOf(520, 'd2d5', 'e7e6', 'd5d1'),
        })
      ).toEqual([{ kind: 'leavesPawnHanging', square: 'd5' }]);
    });

    it('should say that a Miss failed to punish the last move', () => {
      expect(
        remarksOf({
          pgn: '1. e4 e5 2. Nf3 f6 3. d3 *',
          beforePreviousMove: lineOf(30, 'b8c6'),
          before: lineOf(250, 'f3e5', 'f6e5', 'd1h5'),
          after: lineOf(100, 'b8c6'),
        })
      ).toEqual([
        { kind: 'missedChance' },
        { kind: 'allowsMove', reply: 'Nc6' },
      ]);
    });
  });
});
