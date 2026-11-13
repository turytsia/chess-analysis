import { afterEach, describe, expect, it, vi } from 'vitest';

import { isMultiThreadingAvailable, parseInfoLine } from './engine';

describe('engine', () => {
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

  describe('isMultiThreadingAvailable', () => {
    const CHROME =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

    function stubBrowser(userAgent: string, isIsolated: boolean): void {
      vi.stubGlobal('navigator', { userAgent });
      vi.stubGlobal('crossOriginIsolated', isIsolated);
    }

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should be available on an isolated page in Chrome', () => {
      stubBrowser(CHROME, true);

      expect(isMultiThreadingAvailable()).toBe(true);
    });

    it('should be available on an isolated page in Firefox', () => {
      stubBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
        true
      );

      expect(isMultiThreadingAvailable()).toBe(true);
    });

    it('should not be available on a page that is not isolated', () => {
      stubBrowser(CHROME, false);

      expect(isMultiThreadingAvailable()).toBe(false);
    });

    it.each([
      {
        browser: 'Safari on a Mac',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
      },
      {
        browser: 'Safari on an iPhone',
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
      },
      {
        browser: 'Chrome on an iPhone',
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
      },
    ])('should not be available in $browser', ({ userAgent }) => {
      stubBrowser(userAgent, true);

      expect(isMultiThreadingAvailable()).toBe(false);
    });
  });
});
