import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import gzipSize from 'gzip-size';
import { describe, expect, test } from 'vitest';

const CDN_BUNDLE_PATH = resolve(process.cwd(), 'dist', 'v1', 'track.js');
const SIZE_LIMIT_BYTES = 12 * 1024;

describe('tracker-sdk CDN bundle', () => {
  test('produces a minified standalone bundle at dist/v1/track.js', async () => {
    const source = await readFile(CDN_BUNDLE_PATH, 'utf8');
    expect(source.length).toBeGreaterThan(0);
    expect(source).not.toContain('console.log');
    expect(source).toContain('SpecialistGTM');
  });

  test('stays within the 12 KB gzip size budget', async () => {
    const source = await readFile(CDN_BUNDLE_PATH, 'utf8');
    const gzipped = await gzipSize(source);
    expect(gzipped).toBeLessThanOrEqual(SIZE_LIMIT_BYTES);
  });
});