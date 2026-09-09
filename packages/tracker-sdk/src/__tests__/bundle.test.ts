import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const BUNDLE_PATH = join(process.cwd(), 'dist/v1/track.js');
const GZIP_LIMIT_BYTES = 12 * 1024;

function readBundle(): string {
  return readFileSync(BUNDLE_PATH, 'utf8');
}

describe('CDN standalone bundle (dist/v1/track.js)', () => {
  it('register window.SpecialistGTM and window.sgtm when executed in a DOM environment', () => {
    const script = document.createElement('script');
    script.setAttribute('data-key', 'bundle-test-key');
    document.body.appendChild(script);

    eval(readBundle());

    const globals = window as unknown as {
      SpecialistGTM?: Record<string, unknown>;
      sgtm?: Record<string, unknown>;
    };
    expect(globals.SpecialistGTM).toBeDefined();
    expect(globals.sgtm).toBeDefined();
    expect(globals.SpecialistGTM).toBe(globals.sgtm);
  });

  it('contains no debug console calls and no import/require leakage', () => {
    const code = readBundle();
    expect(code).not.toContain('console.debug');
    expect(code).not.toMatch(/console\.\w+\(/);
    expect(code).not.toMatch(/^\s*import\b/m);
    expect(code).not.toMatch(/require\s*\(/);
  });

  it('stays below the 12 KB gzipped limit', () => {
    const size = gzipSync(readBundle()).byteLength;
    expect(size).toBeLessThan(GZIP_LIMIT_BYTES);
  });
});