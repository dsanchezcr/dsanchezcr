import { readFile, writeFile } from 'node:fs/promises';

/**
 * Replace the content between `<!-- TAG:START -->` and `<!-- TAG:END -->`
 * markers in a file. Returns true if the file was changed.
 *
 * @param {string} filePath Absolute or relative path to the markdown file.
 * @param {string} tag Marker tag name (without the START/END suffix).
 * @param {string} content New content to place between the markers.
 */
export async function replaceBetweenMarkers(filePath, tag, content) {
  const start = `<!-- ${tag}:START -->`;
  const end = `<!-- ${tag}:END -->`;

  let text;
  try {
    text = await readFile(filePath, 'utf8');
  } catch {
    return false;
  }

  const startIdx = text.indexOf(start);
  const endIdx = text.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return false;
  }

  const before = text.slice(0, startIdx + start.length);
  const after = text.slice(endIdx);
  const next = `${before}\n${content}\n${after}`;

  if (next === text) {
    return false;
  }

  await writeFile(filePath, next, 'utf8');
  return true;
}

/**
 * Read and return the trimmed content between a marker pair, or null if the
 * markers are not found.
 *
 * @param {string} filePath Path to the markdown file.
 * @param {string} tag Marker tag name (without the START/END suffix).
 */
export async function extractBetweenMarkers(filePath, tag) {
  const start = `<!-- ${tag}:START -->`;
  const end = `<!-- ${tag}:END -->`;

  let text;
  try {
    text = await readFile(filePath, 'utf8');
  } catch {
    return null;
  }

  const startIdx = text.indexOf(start);
  const endIdx = text.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return null;
  }

  return text.slice(startIdx + start.length, endIdx).trim();
}
