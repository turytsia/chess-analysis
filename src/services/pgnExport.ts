import { MoveLabel, type MoveAssessment } from './classify';
import type { PositionEval } from './evaluation';
import type { GameMove } from './pgn';

const LINE_WIDTH = 80;
const CENTIPAWNS_PER_PAWN = 100;
const ANNOTATOR = 'Chess Analysis';
const UNKNOWN_RESULT = '*';
const SEVEN_TAG_ROSTER = [
  'Event',
  'Site',
  'Date',
  'Round',
  'White',
  'Black',
  'Result',
] as const;
const LABEL_SUFFIXES: Partial<Record<MoveLabel, string>> = {
  [MoveLabel.Brilliant]: '!!',
  [MoveLabel.Great]: '!',
  [MoveLabel.Inaccuracy]: '?!',
  [MoveLabel.Mistake]: '?',
  [MoveLabel.Miss]: '?',
  [MoveLabel.Blunder]: '??',
};

export interface AnnotatedPgnParams {
  headers: Record<string, string>;
  moves: Array<GameMove>;
  evals: Array<PositionEval>;
  assessments: Array<MoveAssessment | undefined>;
  notes: string;
}

export function buildAnnotatedPgn({
  headers,
  moves,
  evals,
  assessments,
  notes,
}: AnnotatedPgnParams): string {
  const tags: Record<string, string> = { ...headers, Annotator: ANNOTATOR };
  const tagNames = [
    ...SEVEN_TAG_ROSTER.filter((name) => name in tags),
    ...Object.keys(tags).filter((name) => !isRosterTag(name)),
  ];
  const tagSection = tagNames.map(
    (name) => `[${name} "${toTagValue(tags[name] ?? '')}"]`
  );

  const gameComment = notes.trim();
  const tokens = [
    ...(gameComment ? [toComment(gameComment)] : []),
    ...moves.flatMap((move, index) => {
      const isNumberNeeded =
        move.color === 'white' || index === 0 || evals[index] !== undefined;
      const label = assessments[index]?.label;
      const evaluation = evals[index + 1];
      return [
        ...(isNumberNeeded ? [toMoveNumber(move)] : []),
        `${move.san}${(label && LABEL_SUFFIXES[label]) ?? ''}`,
        ...(evaluation ? [toEvalComment(evaluation)] : []),
      ];
    }),
    headers.Result ?? UNKNOWN_RESULT,
  ];

  return `${tagSection.join('\n')}\n\n${wrapTokens(tokens)}\n`;
}

function isRosterTag(name: string): boolean {
  return SEVEN_TAG_ROSTER.some((rosterName) => rosterName === name);
}

function toMoveNumber(move: GameMove): string {
  const moveNumber = Math.ceil(move.ply / 2);
  return move.color === 'white' ? `${moveNumber}.` : `${moveNumber}...`;
}

function toEvalComment(evaluation: PositionEval): string {
  const [line] = evaluation.lines;
  if (!line) {
    return '';
  }
  const value =
    line.mate !== undefined
      ? `#${line.mate}`
      : ((line.cp ?? 0) / CENTIPAWNS_PER_PAWN).toFixed(2);
  return `{ [%eval ${value}] }`;
}

function toComment(text: string): string {
  return `{ ${text.replace(/[{}]/g, '').replace(/\s+/g, ' ')} }`;
}

function toTagValue(value: string): string {
  return value.replace(/"/g, "'").replace(/\\/g, '');
}

function wrapTokens(tokens: Array<string>): string {
  return tokens
    .filter((token) => token.length > 0)
    .reduce<Array<string>>((lines, token) => {
      const current = lines[lines.length - 1];
      return current !== undefined &&
        current.length + token.length + 1 <= LINE_WIDTH
        ? [...lines.slice(0, -1), `${current} ${token}`]
        : [...lines, token];
    }, [])
    .join('\n');
}
