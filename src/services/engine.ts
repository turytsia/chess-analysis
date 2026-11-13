const MULTI_THREADED_ENGINE_PATH = 'engine/stockfish-lite.js';
const SINGLE_THREADED_ENGINE_PATH = 'engine/stockfish-lite-single.js';
const HANDSHAKE_TIMEOUT_MS = 30_000;
const INFO_PATTERN =
  /^info .*?\bdepth (\d+) .*?\bmultipv (\d+) .*?\bscore (cp|mate) (-?\d+)(?: (lowerbound|upperbound))? .*?\bpv (.+)$/;

interface EngineOptions {
  threads: number;
  hashMb: number;
  multiPv: number;
}

export interface SearchLine {
  multiPv: number;
  depth: number;
  cp?: number;
  mate?: number;
  pv: Array<string>;
}

export interface Engine {
  readonly isMultiThreaded: boolean;
  configure: (options: EngineOptions) => Promise<void>;
  startNewGame: () => Promise<void>;
  search: (fen: string, depth: number) => Promise<Array<SearchLine>>;
  stop: () => void;
  terminate: () => void;
}

type LineHandler = (line: string) => void;

export function isMultiThreadingAvailable(): boolean {
  return (
    typeof SharedArrayBuffer !== 'undefined' &&
    globalThis.crossOriginIsolated === true
  );
}

export async function createEngine(): Promise<Engine> {
  const multiThreaded = isMultiThreadingAvailable()
    ? await startEngine(MULTI_THREADED_ENGINE_PATH, true).catch(() => undefined)
    : undefined;
  return multiThreaded ?? startEngine(SINGLE_THREADED_ENGINE_PATH, false);
}

export function parseInfoLine(line: string): SearchLine | undefined {
  const match = INFO_PATTERN.exec(line);
  if (!match) {
    return undefined;
  }
  const [, depth, multiPv, scoreType, scoreValue, bound, pv] = match;
  if (bound) {
    return undefined;
  }
  const score = Number(scoreValue);
  return {
    multiPv: Number(multiPv),
    depth: Number(depth),
    ...(scoreType === 'mate' ? { mate: score } : { cp: score }),
    pv: pv.trim().split(/\s+/),
  };
}

class WorkerEngine implements Engine {
  private queue: Promise<unknown> = Promise.resolve();
  private handleLine: LineHandler | undefined;
  private handleFailure: ((error: Error) => void) | undefined;

  constructor(
    private readonly worker: Worker,
    readonly isMultiThreaded: boolean
  ) {
    worker.onmessage = (event: MessageEvent<unknown>) => {
      String(event.data)
        .split('\n')
        .forEach((line) => this.handleLine?.(line.trim()));
    };
    worker.onerror = (event) => {
      this.handleFailure?.(new Error(event.message || 'Engine worker failed'));
    };
  }

  initialize(): Promise<void> {
    return this.enqueue(() =>
      this.request(['uci'], (line) => line === 'uciok', HANDSHAKE_TIMEOUT_MS)
    );
  }

  configure({ threads, hashMb, multiPv }: EngineOptions): Promise<void> {
    return this.enqueue(() =>
      this.request(
        [
          `setoption name Threads value ${this.isMultiThreaded ? threads : 1}`,
          `setoption name Hash value ${hashMb}`,
          `setoption name MultiPV value ${multiPv}`,
          'isready',
        ],
        (line) => line === 'readyok'
      )
    );
  }

  startNewGame(): Promise<void> {
    return this.enqueue(() =>
      this.request(['ucinewgame', 'isready'], (line) => line === 'readyok')
    );
  }

  search(fen: string, depth: number): Promise<Array<SearchLine>> {
    return this.enqueue(async () => {
      const lines = new Map<number, SearchLine>();
      await this.request(
        [`position fen ${fen}`, `go depth ${depth}`],
        (line) => {
          const parsed = parseInfoLine(line);
          if (parsed) {
            lines.set(parsed.multiPv, parsed);
          }
          return line.startsWith('bestmove');
        }
      );
      return [...lines.values()].sort((a, b) => a.multiPv - b.multiPv);
    });
  }

  stop(): void {
    this.worker.postMessage('stop');
  }

  terminate(): void {
    this.worker.terminate();
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private request(
    commands: Array<string>,
    isLastLine: (line: string) => boolean,
    timeoutMs?: number
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer =
        timeoutMs === undefined
          ? undefined
          : setTimeout(
              () => settle(() => reject(new Error('Engine timed out'))),
              timeoutMs
            );
      const settle = (complete: () => void): void => {
        clearTimeout(timer);
        this.handleLine = undefined;
        this.handleFailure = undefined;
        complete();
      };

      this.handleLine = (line) => {
        if (isLastLine(line)) {
          settle(resolve);
        }
      };
      this.handleFailure = (error) => settle(() => reject(error));
      commands.forEach((command) => this.worker.postMessage(command));
    });
  }
}

async function startEngine(
  path: string,
  isMultiThreaded: boolean
): Promise<Engine> {
  const worker = new Worker(new URL(path, document.baseURI));
  const engine = new WorkerEngine(worker, isMultiThreaded);
  try {
    await engine.initialize();
    return engine;
  } catch (error) {
    engine.terminate();
    throw error;
  }
}
