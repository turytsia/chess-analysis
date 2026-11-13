import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src'
);
const SOURCE_FILE = /\.tsx?$/;
const EXPORT_DECLARATION =
  /^export (?:async )?(?:const|function|class|interface|type|enum) ([A-Za-z0-9_]+)/gm;

await checkExports();

async function checkExports() {
  const fileNames = (await readdir(SOURCE_DIR, { recursive: true }))
    .filter((name) => SOURCE_FILE.test(name))
    .map((name) => path.join(SOURCE_DIR, name));
  const files = await Promise.all(
    fileNames.map(async (name) => ({
      name,
      text: await readFile(name, 'utf8'),
    }))
  );

  const unused = files.flatMap(({ name, text }) =>
    [...text.matchAll(EXPORT_DECLARATION)]
      .map(([, exported]) => exported)
      .filter((exported) => !isReferencedElsewhere(exported, name, files))
      .map((exported) => `${path.relative(process.cwd(), name)}: ${exported}`)
  );

  if (unused.length > 0) {
    console.error(`Exports that no other file imports:\n${unused.join('\n')}`);
    process.exitCode = 1;
  }
}

function isReferencedElsewhere(exported, ownName, files) {
  const reference = new RegExp(`\\b${exported}\\b`);
  return files.some(
    ({ name, text }) => name !== ownName && reference.test(text)
  );
}
