import { describe, expect, it } from 'vitest';

import { parseInfoLine } from './engine';

describe('parseInfoLine', () => {
  it('should read depth, line number, centipawn score and moves', () => {
    expect(
      parseInfoLine(
        'info depth 12 seldepth 18 multipv 2 score cp -41 nodes 65485 nps 949057 hashfull 18 time 69 pv c2c4 e7e6 d2d4'
      )
    ).toEqual({
      multiPv: 2,
      depth: 12,
      cp: -41,
      pv: ['c2c4', 'e7e6', 'd2d4'],
    });
  });

  it('should read a mate score', () => {
    expect(
      parseInfoLine(
        'info depth 8 seldepth 2 multipv 1 score mate -3 nodes 1760 nps 880000 time 2 pv a1a8'
      )
    ).toEqual({ multiPv: 1, depth: 8, mate: -3, pv: ['a1a8'] });
  });

  it('should skip scores that are only a bound', () => {
    expect(
      parseInfoLine(
        'info depth 14 seldepth 20 multipv 1 score cp 35 lowerbound nodes 9000 nps 900000 time 10 pv e2e4'
      )
    ).toBeUndefined();
  });

  it.each([
    'info string NNUE evaluation enabled',
    'info depth 10 currmove e2e4 currmovenumber 1',
    'bestmove e2e4 ponder e7e5',
    'readyok',
  ])('should skip the line "%s"', (line) => {
    expect(parseInfoLine(line)).toBeUndefined();
  });
});
