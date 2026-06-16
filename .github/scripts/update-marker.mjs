// Generic helper: replace a marker block in one or more files with the
// trimmed contents of a file.
//   Usage: node update-marker.mjs <TAG> <contentFile> [targetFile ...]
import { readFile } from 'node:fs/promises';
import { replaceBetweenMarkers } from './lib/markers.mjs';

const [tag, contentFile, ...files] = process.argv.slice(2);

if (!tag || !contentFile) {
  console.error('Usage: node update-marker.mjs <TAG> <contentFile> [targetFile ...]');
  process.exit(1);
}

const targets = files.length ? files : ['README.md'];

let raw;
try {
  raw = await readFile(contentFile, 'utf8');
} catch (err) {
  console.error(`Failed to read content file "${contentFile}": ${err.message}`);
  process.exit(1);
}

const content = raw.trim();
if (!content) {
  console.error(`Content file "${contentFile}" is empty; aborting so the failure is visible.`);
  process.exit(1);
}

let changed = false;
for (const file of targets) {
  if (await replaceBetweenMarkers(file, tag, content)) {
    console.log(`Updated ${tag} in ${file}`);
    changed = true;
  }
}
if (!changed) console.log('No marker changes were necessary.');
