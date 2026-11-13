import { describe, expect, it } from 'vitest';

import { MoveLabel, type MoveAssessment } from './classify';
import type { PositionEval } from './evaluation';
import { GamePhase } from './material';
import { parsePgn } from './pgn';
import { buildAnnotatedPgn } from './pgnExport';

const GAME = parsePgn(
  '[Event "Live Chess"]\n[White "Ann"]\n[Black "Bob"]\n[Result "1-0"]\n[TimeControl "600"]\n\n1. e4 c6 2. d4 d5 1-0'
);

function evalOf(cp: number): PositionEval {
  return { lines: [{ cp, depth: 16, pv: [] }] };
}

function assessmentOf(label: MoveLabel): MoveAssessment {
  return {
    label,
    phase: GamePhase.Opening,
    winBefore: 50,
    winAfter: 50,
    winLoss: 0,
    accuracy: 100,
    isBest: false,
  };
}

describe('buildAnnotatedPgn', () => {
  it('should write the tags first, with the standard ones in their usual order', () => {
    const pgn = buildAnnotatedPgn({
      headers: {
        TimeControl: '600',
        Result: '1-0',
        Black: 'Bob',
        White: 'Ann',
        Event: 'Live Chess',
      },
      moves: GAME.moves,
      evals: [],
      assessments: [],
      notes: '',
    });

    expect(pgn.split('\n').slice(0, 6)).toEqual([
      '[Event "Live Chess"]',
      '[White "Ann"]',
      '[Black "Bob"]',
      '[Result "1-0"]',
      '[TimeControl "600"]',
      '[Annotator "Chess Analysis"]',
    ]);
  });

  it('should replace quotes in tag values so the file can be imported again', () => {
    const pgn = buildAnnotatedPgn({
      headers: { White: 'Ann "The Rook" Lee' },
      moves: GAME.moves,
      evals: [],
      assessments: [],
      notes: '',
    });

    expect(pgn.split('\n')[0]).toBe('[White "Ann \'The Rook\' Lee"]');
    expect(parsePgn(pgn).headers.White).toBe("Ann 'The Rook' Lee");
  });

  it('should write plain moves and the result when nothing is analyzed', () => {
    const pgn = buildAnnotatedPgn({
      headers: GAME.headers,
      moves: GAME.moves,
      evals: [],
      assessments: [],
      notes: '',
    });

    expect(pgn.trimEnd().split('\n').at(-1)).toBe('1. e4 c6 2. d4 d5 1-0');
  });

  it('should add annotation glyphs, evaluations and the notes', () => {
    const pgn = buildAnnotatedPgn({
      headers: GAME.headers,
      moves: GAME.moves,
      evals: [
        evalOf(20),
        evalOf(35),
        evalOf(-140),
        { lines: [{ mate: -3, depth: 16, pv: [] }] },
      ],
      assessments: [
        assessmentOf(MoveLabel.Best),
        assessmentOf(MoveLabel.Brilliant),
        assessmentOf(MoveLabel.Blunder),
        undefined,
      ],
      notes: 'Watch the {centre}.\nCastle early.',
    });

    expect(pgn.split('\n\n')[1].replace(/\n/g, ' ').trim()).toBe(
      '{ Watch the centre. Castle early. } 1. e4 { [%eval 0.35] } 1... c6!! { [%eval -1.40] } 2. d4?? { [%eval #-3] } 2... d5 1-0'
    );
  });

  it('should stay readable by the PGN parser', () => {
    const pgn = buildAnnotatedPgn({
      headers: GAME.headers,
      moves: GAME.moves,
      evals: [evalOf(20), evalOf(35), evalOf(-140), evalOf(0), evalOf(10)],
      assessments: GAME.moves.map(() => assessmentOf(MoveLabel.Mistake)),
      notes: 'A note',
    });

    expect(parsePgn(pgn).moves.map(({ san }) => san)).toEqual([
      'e4',
      'c6',
      'd4',
      'd5',
    ]);
  });

  it('should keep lines within 80 characters', () => {
    const long = parsePgn(
      '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 *'
    );
    const pgn = buildAnnotatedPgn({
      headers: {},
      moves: long.moves,
      evals: [],
      assessments: [],
      notes: '',
    });

    expect(pgn.split('\n').every((line) => line.length <= 80)).toBe(true);
    expect(pgn.trimEnd().split('\n').length).toBeGreaterThan(2);
  });
});
