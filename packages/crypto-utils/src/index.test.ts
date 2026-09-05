import { describe, expect, it } from 'vitest';

import { sha256Hex } from './index.js';

describe('sha256Hex', () => {
  it('produces the expected digest for a known input', async () => {
    await expect(sha256Hex('hello world')).resolves.toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    );
  });

  it('handles Uint8Array input', async () => {
    const input = new TextEncoder().encode('abc');
    await expect(sha256Hex(input)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
