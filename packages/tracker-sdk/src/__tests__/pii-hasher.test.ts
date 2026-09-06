import { describe, expect, it } from 'vitest';

import { hashPii } from '../index.js';

const HEX_64 = /^[a-f0-9]{64}$/;

describe('hashPii', () => {
  it('hashes email using the Meta/Google spec (lowercase + trim)', async () => {
    const result = await hashPii({ email: ' Test@Example.COM ' });
    expect(result.em).toBe('973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b');
    expect(result.email_hash).toBe(result.em);
    expect(result.ph).toBeUndefined();
  });

  it('hashes BR phone adding the country code (DDI 55)', async () => {
    const result = await hashPii({ phone: '(11) 99999-9999' });
    expect(result.ph).toBe('a869177964cc68954ffec997bbad30769f8a5a6fdc60f296ddbc60b9347dc416');
    expect(result.phone_number_hash).toBe(result.ph);
  });

  it('keeps the phone unchanged when the DDI is already present', async () => {
    const result = await hashPii({ phone: '5511988887777' });
    expect(result.ph).toBe('fde042094c292fe26c1752aa7760e8090d8dbc01a0f464054c0da6b72d18e8ad');
  });

  it('adds DDI 55 to regional 10-digit numbers', async () => {
    const result = await hashPii({ phone: '(51) 9999-9999' });
    expect(result.ph).toBe('fdee802b592b1d6c192790fb357b43ba902bd7be5251a876cca2358f98735bac');
  });

  it('leaves short numbers untouched', async () => {
    const result = await hashPii({ phone: '99998888' });
    expect(result.ph).toBe('9cb7cd6e671c3d57b6938aca8b498c17c79906f51848390ec3d07575113ce866');
  });

  it('hashes first and last name without accents', async () => {
    const result = await hashPii({ name: 'João Silva' });
    expect(result.fn).toBe('ed2befb11499489e2570cb053f774b8ed93e89eddab3f78867a2a5f32c58845e');
    expect(result.ln).toBe('d24e913a4107af875dc2ac3d419798f3794d00434e5059fbb68ac8d33626eaee');
  });

  it('splits multi-word names into first and last name', async () => {
    const result = await hashPii({ name: 'Maria Clara Costa' });
    expect(result.fn).toBe('94aec9fbed989ece189a7e172c9cf41669050495152bc4c1dbf2a38d7fd85627');
    expect(result.ln).toBe('6305bede06f5254f6cb4877fb74dbe2c40b9b1cf0a5a3bb9082f40a5706144a7');
  });

  it('generates only 64-char lowercase hex hashes', async () => {
    const result = await hashPii({ email: 'a@b.com', phone: '11999999999', name: 'Ana Beatriz' });
    const values = [result.em, result.ph, result.fn, result.ln].filter(
      (value): value is string => value !== undefined,
    );
    expect(values).toHaveLength(4);
    for (const value of values) {
      expect(value).toMatch(HEX_64);
    }
  });

  it('returns an empty object when there is nothing to hash', async () => {
    const result = await hashPii({});
    expect(result).toEqual({});
  });
});