import { create } from 'zustand';

import { ChesscomError, ChesscomErrorCode } from '../services/chesscom';
import {
  importFromChesscom,
  type ImportProgress,
  type ImportSummary,
} from '../services/importer';
import { useSettingsStore } from './settingsStore';

type ImportResult =
  | { status: 'done'; summary: ImportSummary }
  | { status: 'cancelled' }
  | { status: 'failed'; code: ChesscomErrorCode };

interface ImportState {
  progress: ImportProgress | undefined;
  startChesscomImport: (
    username: string,
    monthLimit: number | undefined
  ) => Promise<ImportResult>;
  cancelImport: () => void;
}

export const useImportStore = create<ImportState>()((set, get) => {
  let abortController: AbortController | undefined;

  return {
    progress: undefined,

    startChesscomImport: async (username, monthLimit) => {
      if (get().progress) {
        return { status: 'cancelled' };
      }
      const controller = new AbortController();
      abortController = controller;
      useSettingsStore.getState().setUsername(username.trim());
      set({ progress: { completed: 0, total: 0, imported: 0 } });

      try {
        const summary = await importFromChesscom({
          username,
          monthLimit,
          signal: controller.signal,
          onProgress: (progress) => set({ progress }),
        });
        return { status: 'done', summary };
      } catch (error) {
        if (controller.signal.aborted) {
          return { status: 'cancelled' };
        }
        return {
          status: 'failed',
          code:
            error instanceof ChesscomError
              ? error.code
              : ChesscomErrorCode.Unexpected,
        };
      } finally {
        set({ progress: undefined });
      }
    },

    cancelImport: () => abortController?.abort(),
  };
});
