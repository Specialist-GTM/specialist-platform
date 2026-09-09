import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
const version = packageJson.version;

const dist = resolve(packageRoot, 'dist');
const cdn = resolve(dist, 'cdn');
const source = resolve(dist, 'v1', 'track.js');

const latestPaths = ['v1/track.js', 'track.js'];
const pinnedPath = `v${version}/track.js`;

for (const relativePath of [...latestPaths, pinnedPath]) {
  const destination = resolve(cdn, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

const headers = [
  '/v1/track.js',
  `  Access-Control-Allow-Origin: *`,
  `  Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`,
  `  Content-Type: application/javascript; charset=utf-8`,
  '',
  '/track.js',
  `  Access-Control-Allow-Origin: *`,
  `  Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`,
  `  Content-Type: application/javascript; charset=utf-8`,
  '',
  `/${pinnedPath}`,
  `  Access-Control-Allow-Origin: *`,
  `  Cache-Control: public, max-age=31536000, immutable`,
  `  Content-Type: application/javascript; charset=utf-8`,
  '',
].join('\n');

await writeFile(resolve(cdn, '_headers'), headers, 'utf8');