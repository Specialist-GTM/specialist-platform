import type { TrackEvent } from '@specialist-gtm/shared-types';

import { ensureMetaCookies } from '../identifiers/meta-cookies.js';
import { ensureSessionId, ensureVisitorId } from '../identifiers/visitor-session.js';
import { FormManager } from '../forms/form-manager.js';
import type { FormSubmission } from '../forms/form-manager.js';
import { ClickListener } from '../listeners/click-listener.js';
import { ensureTrackingParams, extractTrackingParams } from '../params/url-params.js';
import { CookieStorage } from '../storage/cookie-storage.js';
import { Dispatcher } from '../transport/dispatcher.js';

export interface TrackerOptions {
  endpoint?: string;
  debug?: boolean;
  storage?: CookieStorage;
  trackClicks?: boolean;
  trackForms?: boolean;
}

export interface InitOptions {
  key: string;
  endpoint?: string;
  debug?: boolean;
  trackClicks?: boolean;
  trackForms?: boolean;
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
  private readonly debug: boolean;
  private readonly storage: CookieStorage;
  private readonly clickListener: ClickListener;
  private readonly formManager: FormManager;
  private readonly dispatcher?: Dispatcher;
  private readonly subscribers = new Set<TrackerSubscriber>();

  constructor(trackKey: string, options: TrackerOptions = {}) {
    this.trackKey = trackKey;
    this.debug = options.debug ?? false;
    this.storage = options.storage ?? new CookieStorage();
    if (options.endpoint !== undefined) {
      this.dispatcher = new Dispatcher(options.endpoint);
    }
    this.clickListener = new ClickListener(this);
    if (options.trackClicks ?? true) {
      this.clickListener.start();
    }
    this.formManager = new FormManager((submission) => {
      this.trackFormEvent(submission);
    });
    if (options.trackForms ?? true) {
      this.formManager.start();
    }
  }

  startClickTracking(): void {
    this.clickListener.start();
  }

  stopClickTracking(): void {
    this.clickListener.stop();
  }

  startFormTracking(): void {
    this.formManager.start();
  }

  stopFormTracking(): void {
    this.formManager.stop();
  }

  subscribe(subscriber: TrackerSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  track(eventName: string, customData: Record<string, unknown> = {}): void {
    const event = this.buildEvent(eventName, customData);
    this.publish(event);
    this.dispatcher?.enqueue(event);
  }

  async trackAsync(eventName: string, customData: Record<string, unknown> = {}): Promise<void> {
    const event = this.buildEvent(eventName, customData);
    this.publish(event);
    if (this.dispatcher === undefined) {
      return;
    }
    await this.dispatcher.sendNow(event);
  }

  private buildEvent(eventName: string, customData: Record<string, unknown>): TrackEvent {
    const eventId = generateEventId();
    return {
      id: eventId,
      trackKey: this.trackKey,
      occurredAt: new Date().toISOString(),
      payload: this.collectEnrichment(eventName, customData, eventId),
    };
  }

  private publish(event: TrackEvent): void {
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
    if (this.debug) {
      console.debug('[sgtm] track', event);
    }
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

  private trackFormEvent(submission: FormSubmission): void {
    const custom: Record<string, unknown> = {};
    if (submission.formId !== undefined) {
      custom.form_id = submission.formId;
    }
    if (submission.formName !== undefined) {
      custom.form_name = submission.formName;
    }
    if (submission.formAction !== undefined) {
      custom.form_action = submission.formAction;
    }
    custom.form_source = submission.source;

    const fields = sanitizePayloadFields(submission.fields, submission);
    if (Object.keys(fields).length > 0) {
      custom.fields = fields;
    }
    if (submission.selector !== undefined) {
      custom.success_selector = submission.selector;
    }
    if (submission.message !== undefined) {
      custom.success_message = submission.message;
    }
    if (submission.pattern !== undefined) {
      custom.thank_you_pattern = submission.pattern;
    }
    if (submission.hashed !== undefined && Object.keys(submission.hashed).length > 0) {
      custom.user_data = submission.hashed;
    }
    this.track('FormSubmit', custom);
    this.track('Lead', custom);
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
}

interface BrowserContext {
  url: string;
  referrer: string | null;
  userAgent: string | null;
  locale: string | null;
  screenResolution: string | null;
}

function sanitizePayloadFields(
  fields: Record<string, string>,
  submission: FormSubmission,
): Record<string, string> {
  const emailNorm = submission.email?.trim().toLowerCase();
  const nameNorm = submission.name?.trim().toLowerCase();
  const phoneDigits = submission.phone?.replace(/\D/g, '');
  const phoneDigitsNoDdi = phoneDigits?.startsWith('55') ? phoneDigits.slice(2) : undefined;

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const valueNorm = value.trim().toLowerCase();
    if (emailNorm !== undefined && valueNorm === emailNorm) {
      continue;
    }
    if (nameNorm !== undefined && valueNorm === nameNorm) {
      continue;
    }
    const valueDigits = value.replace(/\D/g, '');
    if (
      phoneDigits !== undefined &&
      (valueDigits === phoneDigits || valueDigits === phoneDigitsNoDdi)
    ) {
      continue;
    }
    result[key] = value;
  }
  return result;
}