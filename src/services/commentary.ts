import {
  Chess,
  type Color,
  type Move,
  type PieceSymbol,
  type Square,
} from 'chess.js';

import { MoveLabel, type MoveAssessment } from './classify';
import type { PlayerColor, PositionEval } from './evaluation';
import {
  GamePhase,
  getExchangeGain,
  getPiecesAtRisk,
  getSacrifice,
  PIECE_VALUES,
} from './material';
import { toSanLine } from './notation';
import { createMove, type GameMove } from './pgn';

const MAX_REMARKS = 2;
const HORIZON_PLIES = 5;
const FIRST_REPLY_INDEX = 1;
const MIN_MISSED_GAIN = 2;
const MIN_THREAT_GAIN = 2;
const MAX_PAWNS_BACK = 2;
const LONG_HORIZON_PLIES = 9;
const MIN_LATE_LOSS = 2;
const REPLY_MOVES_CHECKED = 4;
const ERROR_LABELS: ReadonlyArray<MoveLabel> = [
  MoveLabel.Inaccuracy,
  MoveLabel.Mistake,
  MoveLabel.Miss,
  MoveLabel.Blunder,
];
const HOME_FILES: Partial<Record<PieceSymbol, string>> = { n: 'bg', b: 'cf' };
const CENTER_SQUARES: ReadonlyArray<string> = ['d4', 'e4', 'd5', 'e5'];
const FILES = 'abcdefgh';
const TACTIC_KINDS: ReadonlyArray<string> = [
  'promotes',
  'winsPiece',
  'winsPawn',
  'winsPieceFor',
  'forks',
  'threatens',
];
const LATER_TACTIC_KINDS: ReadonlyArray<string> = [
  'promotes',
  'winsPiece',
  'winsPieceFor',
  'forks',
];
const REPLY_KINDS: ReadonlyArray<string> = [
  ...TACTIC_KINDS,
  'takesPiece',
  'trades',
  'tradesPieces',
  'givesCheck',
];
const PASSIVE_KINDS: ReadonlyArray<string> = [
  'givesCheck',
  'escapesCheck',
  'forcedMove',
];

type TacticRemark =
  | { kind: 'promotes'; piece: PieceSymbol }
  | { kind: 'winsPiece'; piece: PieceSymbol }
  | { kind: 'winsPawn' }
  | { kind: 'winsPieceFor'; taken: PieceSymbol; given: PieceSymbol }
  | { kind: 'forks'; first: PieceSymbol; second: PieceSymbol }
  | { kind: 'threatens'; piece: PieceSymbol; square: string };

export type PlanRemark =
  | TacticRemark
  | { kind: 'takesBack'; square: string }
  | { kind: 'takesPiece'; piece: PieceSymbol; square: string }
  | { kind: 'trades'; given: PieceSymbol; taken: PieceSymbol; square: string }
  | { kind: 'tradesPieces'; piece: PieceSymbol; square: string }
  | { kind: 'savesPiece'; piece: PieceSymbol }
  | { kind: 'defendsPiece'; piece: PieceSymbol; square: string }
  | { kind: 'castles'; side: 'kingside' | 'queenside' }
  | { kind: 'develops'; piece: PieceSymbol; square: string }
  | { kind: 'takesCenter'; square: string }
  | { kind: 'pushesPassedPawn'; square: string };

export type ReplyRemark =
  | TacticRemark
  | { kind: 'takesPiece'; piece: PieceSymbol; square: string }
  | { kind: 'trades'; given: PieceSymbol; taken: PieceSymbol; square: string }
  | { kind: 'tradesPieces'; piece: PieceSymbol; square: string }
  | { kind: 'givesCheck' };

type IdeaRemark =
  | PlanRemark
  | { kind: 'givesCheck' }
  | { kind: 'escapesCheck' }
  | { kind: 'forcedMove' };

export type MoveRemark =
  | IdeaRemark
  | { kind: 'checkmate' }
  | { kind: 'stalemate' }
  | { kind: 'deadDraw' }
  | { kind: 'bookMove' }
  | { kind: 'sacrifice'; piece: PieceSymbol }
  | { kind: 'onlyGoodMove' }
  | { kind: 'leadsToMate'; moves: number }
  | { kind: 'bestMove' }
  | { kind: 'excellentMove' }
  | { kind: 'goodMove' }
  | { kind: 'goodButNotBest' }
  | { kind: 'allowsMate'; moves: number }
  | { kind: 'missedMate'; moves: number }
  | { kind: 'hangsMovedPiece'; piece: PieceSymbol; square: string }
  | { kind: 'leavesPieceHanging'; piece: PieceSymbol; square: string }
  | { kind: 'leavesPawnHanging'; square: string }
  | { kind: 'losesPieceAfter'; piece: PieceSymbol; reply: string }
  | { kind: 'losesPiece'; piece: PieceSymbol }
  | { kind: 'losesPieceFor'; lost: PieceSymbol; won: PieceSymbol }
  | { kind: 'losesPawn' }
  | { kind: 'losesMaterial' }
  | { kind: 'missedRecapture'; piece: PieceSymbol }
  | { kind: 'missedPiece'; piece: PieceSymbol }
  | { kind: 'missedMaterial' }
  | { kind: 'missedChance' }
  | { kind: 'givesUpCastling' }
  | { kind: 'allows'; reply: string; idea: ReplyRemark; first?: string }
  | { kind: 'allowsMove'; reply: string }
  | { kind: 'strongerPlan'; plan: PlanRemark }
  | { kind: 'strongerMoveAvailable' };

interface MoveContext {
  move: GameMove;
  previousMove: GameMove | undefined;
  assessment: MoveAssessment;
  before: PositionEval;
  after: PositionEval;
}

interface TakenPiece {
  piece: PieceSymbol;
  square: string;
  index: number;
}

interface LineResult {
  balance: number;
  lost: Array<TakenPiece>;
  won: Array<TakenPiece>;
}

/*
 * Explains a move in at most two remarks, most important first. A weak move is
 * explained by what it allows: a checkmate, material lost in the engine's
 * line, a tactic the engine's line now has, or at least the engine's reply.
 * When the engine's own move had a recognizable idea, that idea is added. A
 * good move is explained by what it does on the board. Every remark states
 * something that can be checked on the board or in the engine line, so nothing
 * is guessed, and no remark says who stands better: the evaluation next to the
 * comment already does. Remarks are written from the mover's side and carry
 * only facts (pieces and squares); the text layer turns them into sentences
 * about "you" and "your opponent".
 */
export function describeMove(context: MoveContext): Array<MoveRemark> {
  const remarks =
    describeResult(context) ??
    (ERROR_LABELS.includes(context.assessment.label)
      ? describeError(context)
      : describeGoodMove(context));
  return remarks.slice(0, MAX_REMARKS);
}

function describeResult({
  move,
  after,
}: MoveContext): Array<MoveRemark> | undefined {
  if (after.outcome === undefined) {
    return undefined;
  }
  if (after.outcome !== 'draw') {
    return [{ kind: 'checkmate' }];
  }
  return [
    {
      kind: new Chess(move.fenAfter).isStalemate() ? 'stalemate' : 'deadDraw',
    },
  ];
}

function describeError(context: MoveContext): Array<MoveRemark> {
  const { move, assessment, before, after } = context;
  const opponent = getOpponent(move.color);
  const allowedMate = getMateIn(after, opponent);
  if (allowedMate !== undefined && getMateIn(before, opponent) === undefined) {
    return [{ kind: 'allowsMate', moves: allowedMate }];
  }
  const missedMate = getMateIn(before, move.color);
  if (missedMate !== undefined && getMateIn(after, move.color) === undefined) {
    return [{ kind: 'missedMate', moves: missedMate }];
  }

  const loss =
    describeMaterialError(context) ??
    describeAllowedTactic(context) ??
    describeLateLoss(context);
  if (loss) {
    return [loss];
  }

  const idea = describeIdea(
    move,
    context.previousMove,
    assessment.phase,
    after
  );
  const plan = describeStrongerPlan(context, idea);
  const consequence = describeLostCastling(move) ??
    describeAllowedReply(context) ?? { kind: 'strongerMoveAvailable' };
  if (assessment.label === MoveLabel.Miss) {
    return [{ kind: 'missedChance' }, plan ?? consequence];
  }
  return plan ? [consequence, plan] : [consequence];
}

function describeGoodMove(context: MoveContext): Array<MoveRemark> {
  const { move, assessment, after } = context;
  const mateIn = getMateIn(after, move.color);
  const idea = describeIdea(
    move,
    context.previousMove,
    assessment.phase,
    after,
    assessment.label === MoveLabel.Brilliant
  );
  if (assessment.label === MoveLabel.Good) {
    const plan = describeStrongerPlan(context, idea);
    return plan
      ? [idea ?? { kind: 'goodMove' }, plan]
      : [idea ?? { kind: 'goodButNotBest' }];
  }

  const remarks = [
    describeLabel(context),
    mateIn === undefined
      ? undefined
      : ({ kind: 'leadsToMate', moves: mateIn } as const),
    idea,
  ].filter((remark) => remark !== undefined);
  if (remarks.length > 0) {
    return remarks;
  }
  return [
    {
      kind:
        assessment.label === MoveLabel.Excellent ? 'excellentMove' : 'bestMove',
    },
  ];
}

function describeLabel({
  move,
  assessment,
}: MoveContext): MoveRemark | undefined {
  if (assessment.label === MoveLabel.Book) {
    return { kind: 'bookMove' };
  }
  if (assessment.label === MoveLabel.Brilliant) {
    const sacrifice = getSacrifice(move);
    return sacrifice && { kind: 'sacrifice', piece: sacrifice.piece };
  }
  return assessment.label === MoveLabel.Great
    ? { kind: 'onlyGoodMove' }
    : undefined;
}

/*
 * What a move does on the board. A move that leaves its own piece to be taken
 * is only described by what it captures, unless it is a known sacrifice:
 * praising a piece for attacking something while it hangs would mislead.
 */
function describeIdea(
  move: GameMove,
  previousMove: GameMove | undefined,
  phase: GamePhase,
  followUp: PositionEval,
  isSacrifice = false
): IdeaRemark | undefined {
  if (new Chess(move.fenBefore).moves().length === 1) {
    return { kind: 'forcedMove' };
  }
  if (move.promotion) {
    return { kind: 'promotes', piece: move.promotion };
  }
  const capture = describeCapture(move, previousMove, followUp);
  if (capture) {
    return capture;
  }
  if (!isSacrifice && getExchangeGain(move.fenAfter, move.to) > 0) {
    return undefined;
  }
  return (
    describeFork(move) ??
    describeRescue(move) ??
    describeThreat(move) ??
    describeQuietIdea(move, previousMove, phase)
  );
}

/*
 * What the engine's line does against a weak move, when that is a tactic: this
 * is how the move helps the other side. The first reply counts with any
 * tactic. The same side's next moves in the line count only with a tactic that
 * wins something, because a plain attack several moves away explains little.
 */
function describeAllowedTactic({
  move,
  assessment,
  after,
}: MoveContext): MoveRemark | undefined {
  const pv = after.lines[0]?.pv ?? [];
  const line = toLine(
    move.fenAfter,
    pv.slice(0, 2 * REPLY_MOVES_CHECKED - 1),
    move.ply + 1
  );
  const [first] = line;
  for (let index = 0; index < line.length; index += 2) {
    const reply = line[index];
    const idea = describeIdea(
      reply,
      line[index - 1] ?? move,
      assessment.phase,
      toEval(pv.slice(index + 1))
    );
    const isFirst = index === 0;
    if (
      idea &&
      isTactic(idea) &&
      (isFirst || LATER_TACTIC_KINDS.includes(idea.kind))
    ) {
      return {
        kind: 'allows',
        reply: reply.san,
        idea,
        ...(!isFirst && { first: first.san }),
      };
    }
  }
  return undefined;
}

/*
 * The engine's reply to a weak move that has no tactic in it: what the reply
 * does when that is a consequence of the move (a capture, a trade, a check),
 * and otherwise just the reply itself.
 */
function describeAllowedReply({
  move,
  assessment,
  after,
}: MoveContext): MoveRemark | undefined {
  const [replyUci, ...followUp] = after.lines[0]?.pv ?? [];
  const reply = replyUci
    ? toMove(move.fenAfter, replyUci, move.ply + 1)
    : undefined;
  if (!reply) {
    return undefined;
  }
  const idea = describeIdea(reply, move, assessment.phase, toEval(followUp));
  return idea && isReplyIdea(idea)
    ? { kind: 'allows', reply: reply.san, idea }
    : { kind: 'allowsMove', reply: reply.san };
}

/*
 * What the engine's own move would have done instead of the one played. The
 * move itself is not named, only its idea, and nothing is said when that idea
 * is the same as the idea of the move that was played, or when both moves take
 * on the same square.
 */
function describeStrongerPlan(
  { move, previousMove, assessment, before }: MoveContext,
  playedIdea: IdeaRemark | undefined
): MoveRemark | undefined {
  const [bestUci, ...followUp] = before.lines[0]?.pv ?? [];
  const best =
    bestUci && bestUci !== move.uci
      ? toMove(move.fenBefore, bestUci, move.ply)
      : undefined;
  if (!best || (best.captured && best.to === move.to)) {
    return undefined;
  }
  const idea = describeIdea(
    best,
    previousMove,
    assessment.phase,
    toEval(followUp)
  );
  return idea &&
    isPlan(idea) &&
    JSON.stringify(idea) !== JSON.stringify(playedIdea)
    ? { kind: 'strongerPlan', plan: idea }
    : undefined;
}

/*
 * A capture is judged by the exchange on its square and is called a win only
 * when the engine's line agrees that material stays won; otherwise the remark
 * just says what was taken.
 */
function describeCapture(
  move: GameMove,
  previousMove: GameMove | undefined,
  after: PositionEval
): IdeaRemark | undefined {
  if (!move.captured) {
    return undefined;
  }
  const lossBack = getExchangeGain(move.fenAfter, move.to);
  const gain = PIECE_VALUES[move.captured] - lossBack;
  if (previousMove?.captured && previousMove.to === move.to) {
    return gain >= 0 ? { kind: 'takesBack', square: move.to } : undefined;
  }
  if (gain === 0 && lossBack > 0) {
    return move.captured === move.piece
      ? { kind: 'tradesPieces', piece: move.piece, square: move.to }
      : {
          kind: 'trades',
          given: move.piece,
          taken: move.captured,
          square: move.to,
        };
  }
  if (gain <= 0) {
    return undefined;
  }
  const line = playOut(move.fenBefore, [
    move.uci,
    ...(after.lines[0]?.pv ?? []),
  ]);
  if (line.balance <= 0) {
    return { kind: 'takesPiece', piece: move.captured, square: move.to };
  }
  if (move.captured === 'p') {
    return { kind: 'winsPawn' };
  }
  return lossBack > PIECE_VALUES.p
    ? { kind: 'winsPieceFor', taken: move.captured, given: move.piece }
    : { kind: 'winsPiece', piece: move.captured };
}

/*
 * A fork is named only when the moved piece cannot be taken with profit and
 * attacks two targets worth attacking: the king, a piece worth more than the
 * attacker, or a piece that nobody defends and that does not attack the moved
 * piece back.
 */
function describeFork(move: GameMove): IdeaRemark | undefined {
  if (getExchangeGain(move.fenAfter, move.to) > 0) {
    return undefined;
  }
  const chess = new Chess(move.fenAfter);
  const mover = toColor(move.color);
  const opponent = toColor(getOpponent(move.color));
  const square = move.to as Square;
  const attackerValue = PIECE_VALUES[move.promotion ?? move.piece];
  const attackedBack = chess.attackers(square, opponent);

  const [first, second] = chess
    .board()
    .flat()
    .filter(
      (piece) =>
        piece !== null &&
        piece.color === opponent &&
        piece.type !== 'p' &&
        chess.attackers(piece.square, mover).includes(square) &&
        (piece.type === 'k' ||
          PIECE_VALUES[piece.type] > attackerValue ||
          (!attackedBack.includes(piece.square) &&
            chess.attackers(piece.square, opponent).length === 0))
    )
    .flatMap((piece) => (piece ? [piece.type] : []))
    .sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a]);
  return first && second ? { kind: 'forks', first, second } : undefined;
}

function describeRescue(move: GameMove): IdeaRemark | undefined {
  const opponentToMove = passTurn(move.fenBefore);
  if (!opponentToMove || new Chess(move.fenAfter).isCheck()) {
    return undefined;
  }
  const atRiskBefore = getPiecesAtRisk(opponentToMove);
  if (atRiskBefore.length === 0) {
    return undefined;
  }
  const atRiskAfter = getPiecesAtRisk(move.fenAfter).map(
    ({ square }): string => square
  );
  const moved = atRiskBefore.find(({ square }) => square === move.from);
  if (moved && !atRiskAfter.includes(move.to)) {
    return { kind: 'savesPiece', piece: moved.piece };
  }
  const defended = atRiskBefore.find(
    ({ square }) => square !== move.from && !atRiskAfter.includes(square)
  );
  return (
    defended && {
      kind: 'defendsPiece',
      piece: defended.piece,
      square: defended.square,
    }
  );
}

function describeThreat(move: GameMove): IdeaRemark | undefined {
  const moverToMove = passTurn(move.fenAfter);
  if (!moverToMove || new Chess(move.fenBefore).isCheck()) {
    return undefined;
  }
  const atRiskBefore = getPiecesAtRisk(move.fenBefore).map(
    ({ square }): string => square
  );
  const [threat] = getPiecesAtRisk(moverToMove)
    .filter(
      ({ square, total }) =>
        total >= MIN_THREAT_GAIN && !atRiskBefore.includes(square)
    )
    .sort((a, b) => b.total - a.total);
  return (
    threat && { kind: 'threatens', piece: threat.piece, square: threat.square }
  );
}

function describeQuietIdea(
  move: GameMove,
  previousMove: GameMove | undefined,
  phase: GamePhase
): IdeaRemark | undefined {
  if (move.san.startsWith('O-O')) {
    return {
      kind: 'castles',
      side: move.san.startsWith('O-O-O') ? 'queenside' : 'kingside',
    };
  }
  if (phase === GamePhase.Opening && isDevelopingMove(move)) {
    return { kind: 'develops', piece: move.piece, square: move.to };
  }
  if (
    phase === GamePhase.Opening &&
    move.piece === 'p' &&
    CENTER_SQUARES.includes(move.to)
  ) {
    return { kind: 'takesCenter', square: move.to };
  }
  if (phase === GamePhase.Endgame && move.piece === 'p' && isPassedPawn(move)) {
    return { kind: 'pushesPassedPawn', square: move.to };
  }
  if (move.san.endsWith('+')) {
    return { kind: 'givesCheck' };
  }
  return previousMove?.san.endsWith('+') ? { kind: 'escapesCheck' } : undefined;
}

/*
 * Material is counted along the engine's line: the move that was played
 * followed by the best play after it, against the best line from the position
 * before. A loss is reported only when the played line ends with less
 * material than it started with, so a sacrifice the engine itself recommends
 * is never called a loss.
 */
function describeMaterialError({
  move,
  previousMove,
  before,
  after,
}: MoveContext): MoveRemark | undefined {
  const [bestLine] = before.lines;
  const [replyLine] = after.lines;
  const played = playOut(move.fenBefore, [move.uci, ...(replyLine?.pv ?? [])]);
  const best = playOut(move.fenBefore, bestLine?.pv ?? []);
  const drop = best.balance - played.balance;

  const recapture = bestLine?.pv[0]?.slice(2, 4);
  if (
    previousMove?.captured &&
    recapture === previousMove.to &&
    move.to !== previousMove.to &&
    drop > 0
  ) {
    return {
      kind: 'missedRecapture',
      piece: previousMove.promotion ?? previousMove.piece,
    };
  }
  if (played.balance < 0 && drop > 0) {
    return describeLoss(played, move, replyLine?.pv ?? []);
  }
  if (best.balance > 0 && drop >= MIN_MISSED_GAIN) {
    const [piece, ...others] = best.won.filter(isPiece);
    return piece && others.length === 0 && !best.lost.some(isPiece)
      ? { kind: 'missedPiece', piece: piece.piece }
      : { kind: 'missedMaterial' };
  }
  return undefined;
}

/*
 * Names what is lost. A piece that is taken back at once on the same square by
 * taking a piece of the same value is a trade, and trades are left out first. Of what remains: when the reply takes a
 * piece at once and the line never wins it back, that piece is the story even
 * if more captures follow; when nothing remains, what is really lost is pawns.
 */
function describeLoss(
  played: LineResult,
  move: GameMove,
  replyPv: Array<string>
): MoveRemark {
  const lostPieces = played.lost
    .filter(isPiece)
    .filter((piece) => !played.won.some((other) => isTrade(piece, other)));
  const wonPieces = played.won
    .filter(isPiece)
    .filter((piece) => !played.lost.some((other) => isTrade(other, piece)));
  const [lost] = lostPieces;
  if (!lost || getTotalValue(lostPieces) <= getTotalValue(wonPieces)) {
    if (played.balance !== -PIECE_VALUES.p) {
      return { kind: 'losesMaterial' };
    }
    const [first] = played.lost;
    return !lost && first.index === FIRST_REPLY_INDEX
      ? { kind: 'leavesPawnHanging', square: first.square }
      : { kind: 'losesPawn' };
  }
  const isLostForGood =
    -played.balance >= PIECE_VALUES[lost.piece] - MAX_PAWNS_BACK;
  if (lost.index === FIRST_REPLY_INDEX && isLostForGood) {
    return {
      kind: lost.square === move.to ? 'hangsMovedPiece' : 'leavesPieceHanging',
      piece: lost.piece,
      square: lost.square,
    };
  }
  const [won] = wonPieces;
  if (lostPieces.length > 1 || wonPieces.length > 1) {
    return { kind: 'losesMaterial' };
  }
  if (won) {
    return { kind: 'losesPieceFor', lost: lost.piece, won: won.piece };
  }
  const [reply] = toSanLine(move.fenAfter, replyPv, 1);
  return reply
    ? { kind: 'losesPieceAfter', piece: lost.piece, reply }
    : { kind: 'losesPiece', piece: lost.piece };
}

/*
 * A second, longer look along the engine's line for moves that cost a lot.
 * That far out the line is less certain, so only the loss of a piece counts,
 * never a pawn, and the loss is not pinned on the first reply.
 */
function describeLateLoss({
  move,
  assessment,
  before,
  after,
}: MoveContext): MoveRemark | undefined {
  const replyPv = after.lines[0]?.pv ?? [];
  if (
    assessment.label !== MoveLabel.Mistake &&
    assessment.label !== MoveLabel.Blunder
  ) {
    return undefined;
  }
  const played = playOut(
    move.fenBefore,
    [move.uci, ...replyPv],
    LONG_HORIZON_PLIES
  );
  const best = playOut(
    move.fenBefore,
    before.lines[0]?.pv ?? [],
    LONG_HORIZON_PLIES
  );
  const isPieceLost =
    getTotalValue(played.lost.filter(isPiece)) >
    getTotalValue(played.won.filter(isPiece));
  if (
    !isPieceLost ||
    played.balance > -MIN_LATE_LOSS ||
    best.balance <= played.balance
  ) {
    return undefined;
  }
  const loss = describeLoss(played, move, replyPv);
  return loss.kind === 'losesPieceAfter'
    ? { kind: 'losesPiece', piece: loss.piece }
    : loss;
}

function describeLostCastling(move: GameMove): MoveRemark | undefined {
  const rights = move.color === 'white' ? /[KQ]/ : /[kq]/;
  const hadRights = rights.test(move.fenBefore.split(' ')[2]);
  const hasRights = rights.test(move.fenAfter.split(' ')[2]);
  return move.piece === 'k' &&
    hadRights &&
    !hasRights &&
    !move.san.startsWith('O-O')
    ? { kind: 'givesUpCastling' }
    : undefined;
}

/*
 * Plays a line and counts material from the point of view of the side that
 * moves first. Counting goes a fixed number of moves deep and then on for as
 * long as the line keeps capturing, so it does not stop in the middle of an
 * exchange. If the line itself ends on a capture, the exchange on that square
 * is finished statically.
 */
function playOut(
  fen: string,
  ucis: Array<string>,
  horizon = HORIZON_PLIES
): LineResult {
  const chess = new Chess(fen);
  const side = chess.turn();
  const result: LineResult = { balance: 0, lost: [], won: [] };
  let lastMove: Move | undefined;

  for (const [index, uci] of ucis.entries()) {
    const played = tryMove(chess, uci);
    if (!played) {
      break;
    }
    if (index >= horizon && !played.captured && !played.promotion) {
      chess.undo();
      break;
    }
    const sign = played.color === side ? 1 : -1;
    if (played.captured) {
      result.balance += sign * PIECE_VALUES[played.captured];
      (sign > 0 ? result.won : result.lost).push({
        piece: played.captured,
        square: played.isEnPassant()
          ? `${played.to[0]}${played.from[1]}`
          : played.to,
        index,
      });
    }
    if (played.promotion) {
      result.balance +=
        sign * (PIECE_VALUES[played.promotion] - PIECE_VALUES.p);
    }
    lastMove = played;
  }

  const pendingGain = lastMove?.captured
    ? getExchangeGain(chess.fen(), lastMove.to)
    : 0;
  if (lastMove && pendingGain > 0) {
    const sign = chess.turn() === side ? 1 : -1;
    result.balance += sign * pendingGain;
    (sign > 0 ? result.won : result.lost).push({
      piece: lastMove.promotion ?? lastMove.piece,
      square: lastMove.to,
      index: chess.history().length,
    });
  }
  return result;
}

function tryMove(chess: Chess, uci: string): Move | undefined {
  try {
    return chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4, 5) || undefined,
    });
  } catch {
    return undefined;
  }
}

/*
 * The same position with the other side to move, used to ask "what could be
 * taken if nothing were done about it". There is no such position when the
 * side to move is in check.
 */
function passTurn(fen: string): string | undefined {
  if (new Chess(fen).isCheck()) {
    return undefined;
  }
  const [placement, turn, castling, , halfMoves, fullMoves] = fen.split(' ');
  return [
    placement,
    turn === 'w' ? 'b' : 'w',
    castling,
    '-',
    halfMoves,
    fullMoves,
  ].join(' ');
}

function getMateIn(
  evaluation: PositionEval,
  winner: PlayerColor
): number | undefined {
  const mate = evaluation.lines[0]?.mate;
  if (mate === undefined || mate === 0) {
    return undefined;
  }
  return mate > 0 === (winner === 'white') ? Math.abs(mate) : undefined;
}

function isDevelopingMove(move: GameMove): boolean {
  const homeRank = move.color === 'white' ? '1' : '8';
  return (
    move.from[1] === homeRank &&
    (HOME_FILES[move.piece]?.includes(move.from[0]) ?? false)
  );
}

function isPassedPawn(move: GameMove): boolean {
  const file = FILES.indexOf(move.to[0]);
  const rank = Number(move.to[1]);
  const opponent = toColor(getOpponent(move.color));
  return !new Chess(move.fenAfter)
    .board()
    .flat()
    .some((piece) => {
      if (piece === null || piece.type !== 'p' || piece.color !== opponent) {
        return false;
      }
      const pawnRank = Number(piece.square[1]);
      const isAhead =
        move.color === 'white' ? pawnRank > rank : pawnRank < rank;
      return isAhead && Math.abs(FILES.indexOf(piece.square[0]) - file) <= 1;
    });
}

function toMove(fen: string, uci: string, ply: number): GameMove | undefined {
  return createMove(fen, uci.slice(0, 2), uci.slice(2, 4), ply);
}

function toLine(
  fen: string,
  ucis: Array<string>,
  firstPly: number
): Array<GameMove> {
  const line: Array<GameMove> = [];
  for (const uci of ucis) {
    const position = line[line.length - 1]?.fenAfter ?? fen;
    const next = toMove(position, uci, firstPly + line.length);
    if (!next) {
      break;
    }
    line.push(next);
  }
  return line;
}

function toEval(pv: Array<string>): PositionEval {
  return { lines: [{ depth: 0, pv }] };
}

function isTactic(idea: IdeaRemark): idea is TacticRemark {
  return TACTIC_KINDS.includes(idea.kind);
}

function isReplyIdea(idea: IdeaRemark): idea is ReplyRemark {
  return REPLY_KINDS.includes(idea.kind);
}

function isPlan(idea: IdeaRemark): idea is PlanRemark {
  return !PASSIVE_KINDS.includes(idea.kind);
}

function isPiece({ piece }: TakenPiece): boolean {
  return piece !== 'p';
}

function isTrade(lost: TakenPiece, won: TakenPiece): boolean {
  return (
    won.square === lost.square &&
    won.index === lost.index + 1 &&
    PIECE_VALUES[won.piece] === PIECE_VALUES[lost.piece]
  );
}

function getTotalValue(taken: Array<TakenPiece>): number {
  return taken.reduce((total, { piece }) => total + PIECE_VALUES[piece], 0);
}

function getOpponent(color: PlayerColor): PlayerColor {
  return color === 'white' ? 'black' : 'white';
}

function toColor(color: PlayerColor): Color {
  return color === 'white' ? 'w' : 'b';
}
