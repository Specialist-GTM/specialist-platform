import type { CookieStorage } from '../storage/cookie-storage.js';

export const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export const CLICK_ID_PARAMS = ['gclid', 'fbclid', 'ttclid'] as const;

export const TRACKING_PARAMS = [...UTM_PARAMS, ...CLICK_ID_PARAMS] as const;

export const TRACKING_PARAMS_COOKIE = '_sgtm_params';
export const TRACKING_PARAMS_TTL_DAYS = 90;

export type TrackingParamName = (typeof TRACKING_PARAMS)[number];
export type TrackingParams = Partial<Record<TrackingParamName, string>>;

export function extractTrackingParams(url: string): TrackingParams {
  const result: TrackingParams = {};
  const queryIndex = url.indexOf('?');
  if (queryIndex < 0) {
    return result;
  }
  const searchParams = new URLSearchParams(url.slice(queryIndex + 1));
  for (const key of TRACKING_PARAMS) {
    const value = searchParams.get(key);
    if (value !== null && value !== '') {
      result[key] = value;
    }
  }
  return result;
}

export function readTrackingParams(storage: CookieStorage): TrackingParams {
  const raw = storage.get(TRACKING_PARAMS_COOKIE);
  if (raw === null) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as TrackingParams;
    }
  } catch {
    // ignore corrupted values
  }
  return {};
}

export function persistTrackingParams(
  storage: CookieStorage,
  params: TrackingParams,
): void {
  const merged: TrackingParams = { ...readTrackingParams(storage), ...params };
  storage.set(TRACKING_PARAMS_COOKIE, JSON.stringify(merged), {
    days: TRACKING_PARAMS_TTL_DAYS,
  });
}

export function ensureTrackingParams(
  storage: CookieStorage,
  url: string,
): TrackingParams {
  const fromUrl = extractTrackingParams(url);
  if (Object.keys(fromUrl).length > 0) {
    persistTrackingParams(storage, fromUrl);
  }
  return readTrackingParams(storage);
}