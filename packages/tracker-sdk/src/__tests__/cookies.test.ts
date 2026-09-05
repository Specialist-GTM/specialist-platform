import { afterEach, describe, expect, it } from 'vitest';

import { CookieStorage, serializeCookie } from '../index.js';

const PAST_EXPIRES = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT';

function readRawCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

describe('serializeCookie', () => {
  it('sets SameSite=Lax, Path=/ and Secure by default', () => {
    const cookie = serializeCookie('_test', 'value');
    expect(cookie).toContain('_test=value');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Secure');
  });

  it('omits Secure when explicitly disabled', () => {
    expect(serializeCookie('_test', 'value', { secure: false })).not.toContain('Secure');
  });

  it('respects an explicit SameSite and path', () => {
    const cookie = serializeCookie('_test', 'value', { sameSite: 'Strict', path: '/app' });
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/app');
  });

  it('overrides expiration in seconds', () => {
    const cookie = serializeCookie('_test', 'value', { seconds: 60, secure: false });
    const expiresPart = cookie.split(';').find((part) => part.trim().startsWith('Expires='));
    expect(expiresPart).toBeDefined();
    const seconds = (new Date(expiresPart!.trim().slice('Expires='.length)).getTime() - Date.now()) / 1000;
    expect(seconds).toBeGreaterThan(55);
    expect(seconds).toBeLessThan(70);
  });

  it('expires in days by default and omits Max-Age when days is zero', () => {
    const defaultCookie = serializeCookie('_test', 'value', { secure: false });
    const days = (new Date(defaultCookie.split(';').find((part) => part.trim().startsWith('Expires='))!.trim().slice('Expires='.length)).getTime() - Date.now()) / 1000 / 60 / 60 / 24;
    expect(days).toBeGreaterThan(89);
    const sessionOnly = serializeCookie('_test', 'value', { secure: false, days: 0 });
    expect(sessionOnly).not.toContain('Expires=');
  });

  it('escapes special characters in the value', () => {
    const cookie = serializeCookie('_test', 'a b&c=d', { secure: false });
    expect(cookie).toContain('_test=a%20b%26c%3Dd');
  });
});

describe('CookieStorage', () => {
  afterEach(() => {
    document.cookie.split(';').forEach((part) => {
      const name = part.trim().split('=')[0];
      if (name !== undefined && name.length > 0) {
        document.cookie = `${name}=; Path=/; SameSite=Lax; ${PAST_EXPIRES}`;
      }
    });
    window.localStorage.clear();
  });

  it('writes and reads a cookie', () => {
    const storage = new CookieStorage();
    storage.set('_fbp', 'fb.1.1234.5678');
    expect(readRawCookie('_fbp')).toBe('fb.1.1234.5678');
    expect(storage.get('_fbp')).toBe('fb.1.1234.5678');
  });

  it('returns null when the cookie does not exist', () => {
    const storage = new CookieStorage();
    expect(storage.get('_missing')).toBeNull();
  });

  it('removes a cookie and its mirror', () => {
    const storage = new CookieStorage();
    storage.mirror('_sgtm_id', 'value');
    storage.remove('_sgtm_id');
    expect(storage.get('_sgtm_id')).toBeNull();
    expect(window.localStorage.getItem('sgtm:_sgtm_id')).toBeNull();
  });

  it('escapes values on round-trip', () => {
    const storage = new CookieStorage();
    storage.set('_test', 'a b&c=d');
    expect(storage.get('_test')).toBe('a b&c=d');
    expect(readRawCookie('_test')).toBe('a b&c=d');
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
      storage.set('_blocked', 'fallback-value');
      expect(readRawCookie('_blocked')).toBeNull();
      expect(storage.get('_blocked')).toBe('fallback-value');
      expect(window.localStorage.getItem('sgtm:_blocked')).toBe('fallback-value');
    } finally {
      Reflect.deleteProperty(document, 'cookie');
    }
  });

  it('reads from localStorage when the cookie is missing', () => {
    const storage = new CookieStorage();
    window.localStorage.setItem('sgtm:_fallback', 'stored');
    expect(storage.get('_fallback')).toBe('stored');
  });

  it('mirrors a value to both cookie and localStorage', () => {
    const storage = new CookieStorage();
    storage.mirror('_sgtm_id', 'visitor-1');
    expect(readRawCookie('_sgtm_id')).toBe('visitor-1');
    expect(window.localStorage.getItem('sgtm:_sgtm_id')).toBe('visitor-1');
  });
});