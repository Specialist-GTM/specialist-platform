import type { CookieStorage } from '../storage/cookie-storage.js';

export const FBP_COOKIE = '_fbp';
export const FBC_COOKIE = '_fbc';

const RANDOM_MIN = 1_000_000_000;
const RANDOM_RANGE = 9_000_000_000;

export function createFbpValue(): string {
  const creationTime = Date.now();
  const random = Math.floor(RANDOM_MIN + Math.random() * RANDOM_RANGE);
  return `fb.1.${creationTime}.${random}`;
}

export function createFbcValue(fbclid: string): string {
  return `fb.1.${Date.now()}.${encodeURIComponent(fbclid)}`;
}

export interface MetaCookieValues {
  fbp: string;
  fbc: string | null;
}

export function ensureMetaCookies(
  storage: CookieStorage,
  fbclid?: string | null,
): MetaCookieValues {
  let fbp = storage.get(FBP_COOKIE);
  if (fbp === null) {
    fbp = createFbpValue();
    storage.set(FBP_COOKIE, fbp);
  }

  let fbc = storage.get(FBC_COOKIE);
  if (fbc === null && fbclid !== undefined && fbclid !== null && fbclid.length > 0) {
    fbc = createFbcValue(fbclid);
    storage.set(FBC_COOKIE, fbc);
  }

  return { fbp, fbc };
}