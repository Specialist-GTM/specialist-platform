import type { TrackEvent } from '@specialist-gtm/shared-types';

import { ensureMetaCookies } from '../identifiers/meta-cookies.js';
import { ensureSessionId, ensureVisitorId } from '../identifiers/visitor-session.js';
import { ensureTrackingParams, extractTrackingParams } from '../params/url-params.js';
import { CookieStorage } from '../storage/cookie-storage.js';

export interface TrackerOptions {
  endpoint?: string;
  debug?: boolean;
  storage?: CookieStorage;
}

export interface InitOptions {
  key: string;
  endpoint?: string;
  debug?: boolean;
}

export type TrackEventData = {
  event_name: string;
  event_id: string;
  url: string;
  referrer: string | null;
  timestamp: number;
  custom_data: Record<string, unknown>;
};

export type TrackerSubscriber = (event: TrackEvent) => void;

let counter = 0;

function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  counter += 1;
  return `evt_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function init(options: InitOptions): Tracker {
  return new Tracker(options.key, options);
}

export class Tracker {
  private readonly trackKey: string;
  private readonly endpoint?: string;
  private readonly debug: boolean;
  private readonly storage: CookieStorage;
  private readonly subscribers = new Set<TrackerSubscriber>();

  constructor(trackKey: string, options: TrackerOptions = {}) {
    this.trackKey = trackKey;
    this.endpoint = options.endpoint;
    this.debug = options.debug ?? false;
    this.storage = options.storage ?? new CookieStorage();
  }

  subscribe(subscriber: TrackerSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  track(eventName: string, customData: Record<string, unknown> = {}): void {
    const eventId = generateEventId();
    const event: TrackEvent = {
      id: eventId,
      trackKey: this.trackKey,
      occurredAt: new Date().toISOString(),
      payload: this.collectEnrichment(eventName, customData, eventId),
    };

    for (const subscriber of this.subscribers) {
      subscriber(event);
    }

    if (this.debug) {
      console.debug('[sgtm] track', event);
    }

    void this.dispatch(event);
  }

  private collectEnrichment(
    eventName: string,
    customData: Record<string, unknown>,
    eventId: string,
  ): TrackEventData {
    const context = this.readBrowserContext();
    const extracted = extractTrackingParams(context.url);
    const urlParams = ensureTrackingParams(this.storage, context.url);
    const meta = ensureMetaCookies(this.storage, extracted.fbclid ?? null);
    const visitorId = ensureVisitorId(this.storage);
    const sessionId = ensureSessionId(this.storage);

    const enrichment: Record<string, unknown> = {
      ...customData,
      _fbp: meta.fbp,
      _sgtm_id: visitorId,
      _sgtm_sess: sessionId,
      context: {
        url: context.url,
        referrer: context.referrer,
        user_agent: context.userAgent,
        locale: context.locale,
        screen_resolution: context.screenResolution,
      },
    };
    if (meta.fbc !== null) {
      enrichment._fbc = meta.fbc;
    }
    if (Object.keys(urlParams).length > 0) {
      enrichment.utms = urlParams;
    }

    return {
      event_name: eventName,
      event_id: eventId,
      url: context.url,
      referrer: context.referrer,
      timestamp: Date.now(),
      custom_data: enrichment,
    };
  }

  private readBrowserContext(): BrowserContext {
    const browser = typeof window !== 'undefined' ? window : null;
    const screen = browser?.screen;
    return {
      url: typeof location !== 'undefined' ? location.href : '',
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      userAgent: browser?.navigator.userAgent ?? null,
      locale: browser?.navigator.language ?? null,
      screenResolution: screen ? `${screen.width}x${screen.height}` : null,
    };
  }

  private async dispatch(event: TrackEvent): Promise<void> {
    if (this.endpoint === undefined) {
      return;
    }
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch {
      if (this.debug) {
        console.warn('[sgtm] dispatch failed', this.endpoint);
      }
    }
  }
}

interface BrowserContext {
  url: string;
  referrer: string | null;
  userAgent: string | null;
  locale: string | null;
  screenResolution: string | null;
}