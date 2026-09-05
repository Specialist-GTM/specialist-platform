import { afterEach, describe, expect, it } from 'vitest';

import {
  CookieStorage,
  createFbcValue,
  createFbpValue,
  ensureMetaCookies,
} from '../index.js';

const FBP_PATTERN = /^fb\.1\.\d{13}\.\d{10}$/;
const PAST_EXPIRES = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT';

function isFresh(value: string): boolean {
  const seconds = (Date.now() - Number(value.split('.')[2])) / 1000;
  return seconds >= 0 && seconds < 2;
}

describe('meta cookies (_fbp / _fbc)', () => {
  afterEach(() => {
    document.cookie.split(';').forEach((part) => {
      const name = part.trim().split('=')[0];
      if (name !== undefined && name.length > 0) {
        document.cookie = `${name}=; Path=/; SameSite=Lax; ${PAST_EXPIRES}`;
      }
    });
  });

  it('creates _fbp in the official Meta format', () => {
    const value = createFbpValue();
    expect(value).toMatch(FBP_PATTERN);
    expect(isFresh(value)).toBe(true);
  });

  it('creates distinct _fbp values across calls', () => {
    expect(createFbpValue()).not.toBe(createFbpValue());
  });

  it('creates _fbc with the official prefix and encoded fbclid', () => {
    const value = createFbcValue('IwAR123');
    expect(value).toMatch(/^fb\.1\.\d{13}\.IwAR123$/);
    expect(isFresh(value)).toBe(true);
  });

  it('encodes the fbclid value', () => {
    const value = createFbcValue('a b&c=d');
    expect(value.endsWith('a%20b%26c%3Dd')).toBe(true);
  });

  it('persists _fbp on first visit and reuses it afterwards', () => {
    const storage = new CookieStorage();
    const first = ensureMetaCookies(storage, null);
    expect(first.fbp).toMatch(FBP_PATTERN);
    expect(first.fbc).toBeNull();

    const second = ensureMetaCookies(storage, null);
    expect(second.fbp).toBe(first.fbp);
  });

  it('creates _fbc from the fbclid in the URL on first visit', () => {
    const storage = new CookieStorage();
    const result = ensureMetaCookies(storage, 'IwAR123');
    expect(result.fbc).toMatch(/^fb\.1\.\d{13}\.IwAR123$/);
  });

  it('ignores an empty fbclid', () => {
    const storage = new CookieStorage();
    const result = ensureMetaCookies(storage, '');
    expect(result.fbc).toBeNull();
  });

  it('does not overwrite an existing _fbc', () => {
    const storage = new CookieStorage();
    ensureMetaCookies(storage, 'first');
    const again = ensureMetaCookies(storage, 'second');
    expect(again.fbc).toMatch(/^fb\.1\.\d{13}\.first$/);
  });

  it('falls back to localStorage when cookies are blocked', () => {
    const storage = new CookieStorage();
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => '',
      set: () => {
        throw new Error('cookies blocked');
      },
    });
    try {
      const first = ensureMetaCookies(storage, null);
      expect(first.fbp).toMatch(FBP_PATTERN);
      expect(window.localStorage.getItem('sgtm:_fbp')).toBe(first.fbp);
    } finally {
      Reflect.deleteProperty(document, 'cookie');
    }
  });
});