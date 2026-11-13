import { beforeEach, describe, expect, it } from 'vitest';

import { getAverageSearchMs, useEngineStatsStore } from './engineStatsStore';

const SINGLE = { isMultiThreaded: false, depth: 16, multiPv: 2 };

function record(durationMs: number, isMultiThreaded = false): void {
  useEngineStatsStore
    .getState()
    .recordSearch(
      { engineName: 'Test engine', isMultiThreaded, durationMs },
      SINGLE.depth,
      SINGLE.multiPv
    );
}

describe('engineStatsStore', () => {
  beforeEach(() => {
    useEngineStatsStore.setState({ engineName: undefined, timings: {} });
  });

  it('should have no average before anything was measured', () => {
    const { timings } = useEngineStatsStore.getState();

    expect(getAverageSearchMs(timings, SINGLE)).toBeUndefined();
  });

  it('should average the searches made with the same settings', () => {
    record(400);
    record(600);

    const { timings, engineName } = useEngineStatsStore.getState();

    expect(getAverageSearchMs(timings, SINGLE)).toBe(500);
    expect(engineName).toBe('Test engine');
  });

  it('should keep other settings apart', () => {
    record(400);
    record(100, true);

    const { timings } = useEngineStatsStore.getState();

    expect(getAverageSearchMs(timings, SINGLE)).toBe(400);
    expect(
      getAverageSearchMs(timings, { ...SINGLE, depth: 18 })
    ).toBeUndefined();
    expect(
      getAverageSearchMs(timings, { ...SINGLE, isMultiThreaded: true })
    ).toBe(100);
  });
});
