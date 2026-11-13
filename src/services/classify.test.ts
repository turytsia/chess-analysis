import { describe, expect, it } from 'vitest';

import {
  assessMoves,
  buildGameReport,
  isCriticalLabel,
  MoveLabel,
} from './classify';
import type { PositionEval } from './evaluation';
import { parsePgn } from './pgn';

const OPENING_MOVES = parsePgn('1. e4 e5 2. Nf3 Nc6 *').moves;
const BISHOP_SACRIFICE = parsePgn(
  '[SetUp "1"]\n[FEN "6k1/5ppp/8/8/8/3B4/5PPP/6K1 w - - 0 1"]\n\n1. Bxh7+ Kxh7 *'
).moves;

function evalOf(cp: number, bestMove = 'a2a3'): PositionEval {
  return { lines: [{ cp, depth: 16, pv: [bestMove] }] };
}

function labelsOf(
  evals: Array<PositionEval>,
  bookPlies = 0
): Array<MoveLabel | undefined> {
  return buildGameReport({
    moves: OPENING_MOVES,
    evals,
    bookPlies,
  }).assessments.map((assessment) => assessment?.label);
}

describe('classify', () => {
  it('should label moves inside the opening book as Book', () => {
    const labels = labelsOf(
      [evalOf(0), evalOf(-400), evalOf(0), evalOf(0), evalOf(0)],
      2
    );

    expect(labels.slice(0, 2)).toEqual([MoveLabel.Book, MoveLabel.Book]);
  });

  it("should label the engine's first choice as Best", () => {
    const labels = labelsOf([
      evalOf(20, 'e2e4'),
      evalOf(20),
      evalOf(20),
      evalOf(20),
      evalOf(20),
    ]);

    expect(labels[0]).toBe(MoveLabel.Best);
  });

  it.each([
    { cpAfter: -10, label: MoveLabel.Excellent },
    { cpAfter: -30, label: MoveLabel.Good },
    { cpAfter: -80, label: MoveLabel.Inaccuracy },
    { cpAfter: -150, label: MoveLabel.Mistake },
    { cpAfter: -400, label: MoveLabel.Blunder },
  ])(
    'should label a move that drops a level position to $cpAfter centipawns as $label',
    ({ cpAfter, label }) => {
      const labels = labelsOf([evalOf(0), evalOf(cpAfter)]);

      expect(labels[0]).toBe(label);
    }
  );

  it('should label a failure to punish a blunder as Miss when the position stays fine', () => {
    const labels = labelsOf([evalOf(0), evalOf(-400), evalOf(0)]);

    expect(labels.slice(0, 2)).toEqual([MoveLabel.Blunder, MoveLabel.Miss]);
  });

  it('should label the only move that holds as Great', () => {
    const before: PositionEval = {
      lines: [
        { cp: 0, depth: 16, pv: ['e2e4'] },
        { cp: -300, depth: 16, pv: ['d2d4'] },
      ],
    };

    expect(labelsOf([before, evalOf(0)])[0]).toBe(MoveLabel.Great);
  });

  it('should not label taking a piece that was just hung as Great', () => {
    const { moves } = parsePgn('1. e4 e5 2. Nf3 Ba3 3. bxa3 *');
    const beforeCapture: PositionEval = {
      lines: [
        { cp: 400, depth: 16, pv: ['b2a3'] },
        { cp: 0, depth: 16, pv: ['b1a3'] },
      ],
    };
    const report = buildGameReport({
      moves,
      evals: [
        evalOf(0),
        evalOf(0),
        evalOf(0),
        evalOf(0),
        beforeCapture,
        evalOf(400),
      ],
      bookPlies: 0,
    });

    expect(report.assessments[4]?.label).toBe(MoveLabel.Best);
  });

  it('should not label a forced reply to a check as Great', () => {
    const { moves } = parsePgn('1. e4 f6 2. Qh5+ g6 *');
    const beforeReply: PositionEval = {
      lines: [
        { cp: 0, depth: 16, pv: ['g7g6'] },
        { cp: 600, depth: 16, pv: ['e8f7'] },
      ],
    };
    const report = buildGameReport({
      moves,
      evals: [evalOf(0), evalOf(0), evalOf(0), beforeReply, evalOf(0)],
      bookPlies: 0,
    });

    expect(report.assessments[3]?.label).toBe(MoveLabel.Best);
  });

  it('should not label the best move as Great when the alternative is also fine', () => {
    const before: PositionEval = {
      lines: [
        { cp: 0, depth: 16, pv: ['e2e4'] },
        { cp: -20, depth: 16, pv: ['d2d4'] },
      ],
    };

    expect(labelsOf([before, evalOf(0)])[0]).toBe(MoveLabel.Best);
  });

  it('should label a sound piece sacrifice as Brilliant', () => {
    const report = buildGameReport({
      moves: BISHOP_SACRIFICE,
      evals: [
        {
          lines: [
            { cp: 60, depth: 16, pv: ['d3h7'] },
            { cp: 0, depth: 16, pv: ['g1f1'] },
          ],
        },
        evalOf(60),
      ],
      bookPlies: 0,
    });

    expect(report.assessments[0]?.label).toBe(MoveLabel.Brilliant);
  });

  it.each([
    { cpAfter: -30, label: MoveLabel.Brilliant },
    { cpAfter: -90, label: MoveLabel.Great },
  ])(
    'should label a sacrifice that leaves the mover at $cpAfter centipawns as $label',
    ({ cpAfter, label }) => {
      const report = buildGameReport({
        moves: BISHOP_SACRIFICE,
        evals: [
          {
            lines: [
              { cp: cpAfter, depth: 16, pv: ['d3h7'] },
              { cp: -400, depth: 16, pv: ['g1f1'] },
            ],
          },
          evalOf(cpAfter),
        ],
        bookPlies: 0,
      });

      expect(report.assessments[0]?.label).toBe(label);
    }
  );

  it('should not label a sacrifice as Brilliant when the game was already won', () => {
    const report = buildGameReport({
      moves: BISHOP_SACRIFICE,
      evals: [
        {
          lines: [
            { cp: 900, depth: 16, pv: ['d3h7'] },
            { cp: 850, depth: 16, pv: ['g1f1'] },
          ],
        },
        evalOf(900),
      ],
      bookPlies: 0,
    });

    expect(report.assessments[0]?.label).toBe(MoveLabel.Best);
  });

  it('should leave moves without both evaluations unassessed', () => {
    expect(labelsOf([evalOf(0), evalOf(0)])).toEqual([
      MoveLabel.Excellent,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('should report accuracy only for a fully analyzed game', () => {
    const partial = buildGameReport({
      moves: OPENING_MOVES,
      evals: [evalOf(0), evalOf(0)],
      bookPlies: 0,
    });
    const complete = buildGameReport({
      moves: OPENING_MOVES,
      evals: [evalOf(0), evalOf(0), evalOf(0), evalOf(0), evalOf(0)],
      bookPlies: 0,
    });

    expect(partial.accuracy).toBeUndefined();
    expect(complete.accuracy).toEqual({ white: 100, black: 100 });
  });

  it('should count labels per side', () => {
    const report = buildGameReport({
      moves: OPENING_MOVES,
      evals: [
        evalOf(0),
        evalOf(-400),
        evalOf(-400),
        evalOf(-400),
        evalOf(-400),
      ],
      bookPlies: 0,
    });

    expect(
      report.counts.find(({ label }) => label === MoveLabel.Blunder)?.count
    ).toEqual({ white: 1, black: 0 });
  });

  it('should assess the moves of a line whose positions are only partly evaluated', () => {
    const assessments = assessMoves({
      moves: OPENING_MOVES,
      evals: [undefined, evalOf(0), evalOf(-400), undefined, evalOf(0)],
      bookPlies: 0,
    });

    expect(assessments.map((assessment) => assessment?.label)).toEqual([
      undefined,
      MoveLabel.Excellent,
      undefined,
      undefined,
    ]);
  });

  it('should treat blunders, mistakes and misses as critical', () => {
    expect(isCriticalLabel(MoveLabel.Blunder)).toBe(true);
    expect(isCriticalLabel(MoveLabel.Mistake)).toBe(true);
    expect(isCriticalLabel(MoveLabel.Miss)).toBe(true);
    expect(isCriticalLabel(MoveLabel.Inaccuracy)).toBe(false);
  });
});
