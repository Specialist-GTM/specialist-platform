import { afterEach, describe, expect, it } from 'vitest';

import {
  CookieStorage,
  ensureTrackingParams,
  extractTrackingParams,
  readTrackingParams,
} from '../index.js';

const PAST_EXPIRES = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT';

describe('url params (UTMs and click ids)', () => {
  afterEach(() => {
    document.cookie.split(';').forEach((part) => {
      const name = part.trim().split('=')[0];
      if (name !== undefined && name.length > 0) {
        document.cookie = `${name}=; Path=/; SameSite=Lax; ${PAST_EXPIRES}`;
      }
    });
    window.localStorage.clear();
  });

  it('extracts UTM params from the query string', () => {
    const url = 'https://ex.com/?utm_source=meta&utm_medium=cpc&utm_campaign=camp&utm_term=t&utm_content=c';
    expect(extractTrackingParams(url)).toEqual({
      utm_source: 'meta',
      utm_medium: 'cpc',
      utm_campaign: 'camp',
      utm_term: 't',
      utm_content: 'c',
    });
  });

  it('extracts click ids from the query string', () => {
    const url = 'https://ex.com/?gclid=g-1&fbclid=IwAR2&ttclid=tt-3';
    expect(extractTrackingParams(url)).toEqual({
      gclid: 'g-1',
      fbclid: 'IwAR2',
      ttclid: 'tt-3',
    });
  });

  it('returns an empty object when there are no tracking params', () => {
    expect(extractTrackingParams('https://ex.com/?foo=bar')).toEqual({});
    expect(extractTrackingParams('https://ex.com/')).toEqual({});
  });

  it('ignores empty tracking values', () => {
    expect(extractTrackingParams('https://ex.com/?utm_source=')).toEqual({});
  });

  it('persists tracking params in a 1st-party cookie', () => {
    const storage = new CookieStorage();
    const params = ensureTrackingParams(storage, 'https://ex.com/?utm_source=meta&fbclid=IwAR1');
    expect(params).toEqual({ utm_source: 'meta', fbclid: 'IwAR1' });
    expect(document.cookie).toContain('_sgtm_params');
    expect(readTrackingParams(storage)).toEqual({ utm_source: 'meta', fbclid: 'IwAR1' });
  });

  it('merges new params into previously persisted ones', () => {
    const storage = new CookieStorage();
    ensureTrackingParams(storage, 'https://ex.com/?utm_source=meta');
    const merged = ensureTrackingParams(storage, 'https://ex.com/?utm_campaign=camp');
    expect(merged).toEqual({ utm_source: 'meta', utm_campaign: 'camp' });
  });

  it('keeps the persisted params when the current URL has none', () => {
    const storage = new CookieStorage();
    ensureTrackingParams(storage, 'https://ex.com/?utm_source=meta');
    const kept = ensureTrackingParams(storage, 'https://ex.com/');
    expect(kept).toEqual({ utm_source: 'meta' });
  });

  it('returns an empty object when the persisted cookie is corrupted', () => {
    const storage = new CookieStorage();
    storage.set('_sgtm_params', '{not-json');
    expect(readTrackingParams(storage)).toEqual({});
  });

  it('falls back to localStorage while keeping the persisted values', () => {
    const storage = new CookieStorage();
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => '',
      set: () => {
        throw new Error('cookies blocked');
      },
    });
    try {
      ensureTrackingParams(storage, 'https://ex.com/?utm_source=meta');
      expect(readTrackingParams(storage)).toEqual({ utm_source: 'meta' });
      expect(window.localStorage.getItem('sgtm:_sgtm_params')).toContain('utm_source');
    } finally {
      Reflect.deleteProperty(document, 'cookie');
    }
  });
});