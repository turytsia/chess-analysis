import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'chess-analysis:settings';
const DEFAULT_DEPTH = 16;
const DEFAULT_HASH_MB = 64;
const DEFAULT_MULTI_PV = 2;
const DEFAULT_MAX_THREADS = 4;

export const ENGINE_LIMITS = {
  minDepth: 12,
  maxDepth: 30,
  minMultiPv: 1,
  maxMultiPv: 3,
  hashOptionsMb: [16, 32, 64, 128, 256, 512],
} as const;

export type Theme = 'system' | 'light' | 'dark';

export interface EngineSettings {
  depth: number;
  threads: number;
  hashMb: number;
  multiPv: number;
}

interface SettingsState {
  username: string;
  theme: Theme;
  engine: EngineSettings;
  setUsername: (username: string) => void;
  setTheme: (theme: Theme) => void;
  updateEngine: (changes: Partial<EngineSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      username: '',
      theme: 'system',
      engine: {
        depth: DEFAULT_DEPTH,
        threads: getDefaultThreads(),
        hashMb: DEFAULT_HASH_MB,
        multiPv: DEFAULT_MULTI_PV,
      },
      setUsername: (username) => set({ username }),
      setTheme: (theme) => set({ theme }),
      updateEngine: (changes) =>
        set(({ engine }) => ({ engine: { ...engine, ...changes } })),
    }),
    { name: STORAGE_KEY }
  )
);

export function getMaxThreads(): number {
  return Math.max(1, globalThis.navigator?.hardwareConcurrency ?? 1);
}

function getDefaultThreads(): number {
  return Math.max(1, Math.min(getMaxThreads() - 1, DEFAULT_MAX_THREADS));
}
