import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ENGINE_DIR = path.join(PUBLIC_DIR, 'engine');
const ENGINE_BUILDS = [
  { pattern: /^stockfish-[\d.]+-lite\.(js|wasm)$/, target: 'stockfish-lite' },
  {
    pattern: /^stockfish-[\d.]+-lite-single\.(js|wasm)$/,
    target: 'stockfish-lite-single',
  },
];

await copyEngineAssets();

async function copyEngineAssets() {
  const require = createRequire(import.meta.url);
  const engineBinDir = path.join(
    path.dirname(require.resolve('stockfish/package.json')),
    'bin'
  );
  const serviceWorkerPath = path.join(
    path.dirname(require.resolve('coi-serviceworker/package.json')),
    'coi-serviceworker.min.js'
  );

  await mkdir(ENGINE_DIR, { recursive: true });

  const engineFiles = await readdir(engineBinDir);
  const copies = ENGINE_BUILDS.map(({ pattern, target }) => {
    const matches = engineFiles.filter((file) => pattern.test(file));
    if (matches.length !== 2) {
      throw new Error(`Expected a .js and a .wasm engine file for ${target}`);
    }
    return matches.map((file) =>
      copyFile(
        path.join(engineBinDir, file),
        path.join(ENGINE_DIR, `${target}${path.extname(file)}`)
      )
    );
  });

  await Promise.all([
    ...copies.flat(),
    copyFile(serviceWorkerPath, path.join(PUBLIC_DIR, 'coi-serviceworker.js')),
  ]);
}
