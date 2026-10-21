// Browser dialogs (window.confirm / alert / prompt) are not allowed in this project:
// use useConfirmDialog() from components/ui/ConfirmDialog.tsx instead.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const SOURCE_DIRECTORIES = ['app', 'components', 'lib'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const BROWSER_DIALOG_PATTERN = /\b(?:window\.)?(?:confirm|alert|prompt)\s*\(/;

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (SOURCE_EXTENSIONS.has(extname(path))) yield path;
  }
}

const offences = SOURCE_DIRECTORIES.flatMap((directory) => [...sourceFiles(directory)])
  .flatMap((file) => readFileSync(file, 'utf8').split('\n')
    .map((line, index) => ({ file, line: index + 1, text: line.trim() }))
    .filter(({ text }) => BROWSER_DIALOG_PATTERN.test(text)));

if (offences.length > 0) {
  offences.forEach(({ file, line, text }) => console.error(`${file}:${line}  ${text}`));
  console.error('\nBrowser dialogs are not allowed. Use useConfirmDialog() from components/ui/ConfirmDialog.tsx.');
  process.exit(1);
}
console.log('No browser dialogs found.');
