import type { CookieStorage } from '../storage/cookie-storage.js';

export const VISITOR_COOKIE = '_sgtm_id';
export const SESSION_COOKIE = '_sgtm_sess';
export const VISITOR_TTL_DAYS = 90;
export const SESSION_INACTIVITY_SECONDS = 30 * 60;

export function createRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const random = (): string => Math.random().toString(36).slice(2);
  return `${random()}${random()}`;
}

export function ensureVisitorId(storage: CookieStorage): string {
  const existing = storage.get(VISITOR_COOKIE);
  if (existing !== null) {
    storage.mirror(VISITOR_COOKIE, existing, { days: VISITOR_TTL_DAYS });
    return existing;
  }
  const id = createRandomId();
  storage.mirror(VISITOR_COOKIE, id, { days: VISITOR_TTL_DAYS });
  return id;
}

export function ensureSessionId(storage: CookieStorage): string {
  const existing = storage.get(SESSION_COOKIE);
  if (existing !== null) {
    storage.set(SESSION_COOKIE, existing, { seconds: SESSION_INACTIVITY_SECONDS });
    return existing;
  }
  const id = createRandomId();
  storage.set(SESSION_COOKIE, id, { seconds: SESSION_INACTIVITY_SECONDS });
  return id;
}