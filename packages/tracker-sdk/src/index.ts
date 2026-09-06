export { autoInit } from './auto-init.js';
export type { SpecialistGTMGlobal } from './auto-init.js';
export { parseScriptConfig, readScriptConfig } from './core/config.js';
export type { TrackerConfig } from './core/config.js';
export { Tracker, init } from './core/tracker.js';
export type {
  InitOptions,
  TrackEventData,
  TrackerOptions,
  TrackerSubscriber,
} from './core/tracker.js';
export { detectContactClick, detectContactFromHref } from './detectors/click-detector.js';
export type { DetectedContact, DetectedContactClick } from './detectors/click-detector.js';
export { parseMailtoUrl } from './detectors/mailto.js';
export type { MailtoDetails } from './detectors/mailto.js';
export { parseTelUrl } from './detectors/tel.js';
export type { TelDetails } from './detectors/tel.js';
export { parseWhatsAppUrl } from './detectors/whatsapp.js';
export type { WhatsAppDetails } from './detectors/whatsapp.js';
export { FBC_COOKIE, FBP_COOKIE, createFbcValue, createFbpValue, ensureMetaCookies } from './identifiers/meta-cookies.js';
export type { MetaCookieValues } from './identifiers/meta-cookies.js';
export {
  SESSION_COOKIE,
  SESSION_INACTIVITY_SECONDS,
  VISITOR_COOKIE,
  VISITOR_TTL_DAYS,
  createRandomId,
  ensureSessionId,
  ensureVisitorId,
} from './identifiers/visitor-session.js';
export {
  CLICK_ID_PARAMS,
  TRACKING_PARAMS,
  TRACKING_PARAMS_COOKIE,
  TRACKING_PARAMS_TTL_DAYS,
  UTM_PARAMS,
  ensureTrackingParams,
  extractTrackingParams,
  persistTrackingParams,
  readTrackingParams,
} from './params/url-params.js';
export type { TrackingParamName, TrackingParams } from './params/url-params.js';
export { CLICK_DEDUPE_WINDOW_MS, ClickListener } from './listeners/click-listener.js';
export { ClickDeduplicator } from './utils/deduplicator.js';
export { sanitizePhone } from './utils/phone.js';
export { CookieStorage, serializeCookie } from './storage/cookie-storage.js';
export type { CookieOptions } from './storage/cookie-storage.js';