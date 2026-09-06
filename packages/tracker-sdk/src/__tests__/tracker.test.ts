import type { TrackEvent } from '@specialist-gtm/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CookieStorage, Tracker, autoInit, init } from '../index.js';

const FBP_PATTERN = /^fb\.1\.\d{13}\.\d{10}$/;
const ORIGINAL_SEND_BEACON = navigator.sendBeacon;

function stubSendBeacon(result: boolean = false): ReturnType<typeof vi.fn> {
  const mock = vi.fn(() => result);
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    writable: true,
    value: mock,
  });
  return mock;
}

function customData(event: TrackEvent): Record<string, unknown> {
  return (event.payload.custom_data ?? {}) as Record<string, unknown>;
}

function subscribe(tracker: Tracker): TrackEvent[] {
  const events: TrackEvent[] = [];
  tracker.subscribe((event) => events.push(event));
  return events;
}

describe('Tracker', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.sgtm = undefined;
    window.SpecialistGTM = undefined;
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    document.cookie.split(';').forEach((part) => {
      const name = part.trim().split('=')[0];
      if (name !== undefined && name.length > 0) {
        document.cookie = `${name}=; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    });
    window.localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (ORIGINAL_SEND_BEACON === undefined) {
      delete (navigator as { sendBeacon?: typeof navigator.sendBeacon }).sendBeacon;
    } else {
      Object.defineProperty(navigator, 'sendBeacon', {
        configurable: true,
        writable: true,
        value: ORIGINAL_SEND_BEACON,
      });
    }
  });

  it('enriches the payload with identifiers and browser context', () => {
    const tracker = new Tracker('test-key');
    const events = subscribe(tracker);
    tracker.track('PageView', { custom: 'data' });

    const payload = events[0]!.payload;
    expect(payload.event_name).toBe('PageView');
    expect(payload.event_id).toBe(events[0]!.id);
    expect(payload.timestamp).toEqual(expect.any(Number));
    expect(payload.url).toContain('localhost');
    const data = customData(events[0]!);
    expect(data.custom).toBe('data');
    expect(data._fbp).toMatch(FBP_PATTERN);
    expect(data._sgtm_id).toEqual(expect.any(String));
    expect(data._sgtm_sess).toEqual(expect.any(String));
    expect(data.context).toMatchObject({
      url: expect.any(String),
      locale: expect.any(String),
      screen_resolution: expect.any(String),
    });
  });

  it('keeps a stable visitor and session id across tracks', () => {
    const tracker = new Tracker('test-key');
    const events = subscribe(tracker);
    tracker.track('PageView');
    tracker.track('Click');

    expect(events).toHaveLength(2);
    const firstData = customData(events[0]!);
    const secondData = customData(events[1]!);
    expect(secondData._sgtm_id).toBe(firstData._sgtm_id);
    expect(secondData._sgtm_sess).toBe(firstData._sgtm_sess);
    expect(secondData._fbp).toBe(firstData._fbp);
  });

  it('extracts and persists UTM and fbclid params from the URL', () => {
    window.history.replaceState({}, '', '/?utm_source=meta&utm_campaign=camp&fbclid=IwAR1');
    const tracker = new Tracker('test-key');
    const events = subscribe(tracker);
    tracker.track('PageView');

    const payload = events[0]!.payload;
    expect(payload.url).toContain('utm_source=meta');
    const data = customData(events[0]!);
    expect(data.utms).toEqual({ utm_source: 'meta', utm_campaign: 'camp', fbclid: 'IwAR1' });
    expect(data._fbc).toMatch(/^fb\.1\.\d{13}\.IwAR1$/);
  });

  it('does not let custom data override internal identifiers', () => {
    const tracker = new Tracker('test-key');
    const events = subscribe(tracker);
    tracker.track('Purchase', { _fbp: 'spoofed', _sgtm_id: 'spoofed' });

    const data = customData(events[0]!);
    expect(data._fbp).toMatch(FBP_PATTERN);
    expect(data._sgtm_id).not.toBe('spoofed');
  });

  it('notifies subscribers and lets them unsubscribe', () => {
    const tracker = new Tracker('test-key');
    const subscriber = vi.fn();
    const unsubscribe = tracker.subscribe(subscriber);
    tracker.track('PageView');
    unsubscribe();
    tracker.track('Click');

    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('dispatches the enriched event to the endpoint as a batch', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    stubSendBeacon(false);

    const tracker = new Tracker('dispatch-key', {
      endpoint: 'https://e.example.com/track',
    });
    tracker.track('PageView');
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://e.example.com/track');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'content-type': 'application/json' });
    const [event] = JSON.parse(init?.body as string) as TrackEvent[];
    expect(event!.trackKey).toBe('dispatch-key');
    expect(event!.payload.event_name).toBe('PageView');
    expect(customData(event!)._sgtm_id).toEqual(expect.any(String));
    vi.useRealTimers();
  });

  it('batches two rapid tracks into a single request', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    stubSendBeacon(false);

    const tracker = new Tracker('batch-key', {
      endpoint: 'https://e.example.com/track',
    });
    tracker.track('PageView');
    tracker.track('Click');
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as TrackEvent[];
    expect(body.map((event) => event.payload.event_name)).toEqual(['PageView', 'Click']);
    vi.useRealTimers();
  });

  it('sends a batch immediately with trackAsync', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    stubSendBeacon(false);

    const tracker = new Tracker('async-key', {
      endpoint: 'https://e.example.com/track',
    });
    await tracker.trackAsync('Lead');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as TrackEvent[];
    expect(body[0]?.payload.event_name).toBe('Lead');
  });

  it('does not dispatch when no endpoint is configured', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const tracker = new Tracker('test-key');
    tracker.track('PageView');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not throw when dispatch fails', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    stubSendBeacon(false);
    const tracker = new Tracker('test-key', { endpoint: 'https://e.example.com/track' });
    expect(() => tracker.track('PageView')).not.toThrow();
    await vi.advanceTimersByTimeAsync(500);
    vi.useRealTimers();
  });

  it('supports programmatic init', () => {
    const tracker = init({ key: 'prog-key', endpoint: 'https://e.example.com/track' });
    const events = subscribe(tracker);
    tracker.track('PageView');
    expect(events[0]?.trackKey).toBe('prog-key');
  });

  it('uses a custom storage when provided', () => {
    const tracker = new Tracker('test-key', { storage: new CookieStorage() });
    const events = subscribe(tracker);
    tracker.track('PageView');
    expect(customData(events[0]!)._sgtm_id).toEqual(expect.any(String));
  });
});

describe('auto-init via script tag', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    window.sgtm = undefined;
    window.SpecialistGTM = undefined;
    document.cookie.split(';').forEach((part) => {
      const name = part.trim().split('=')[0];
      if (name !== undefined && name.length > 0) {
        document.cookie = `${name}=; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    });
  });

  it('reads data-key, data-endpoint and data-debug from the script tag', () => {
    const script = document.createElement('script');
    script.setAttribute('data-key', 'auto-key');
    script.setAttribute('data-endpoint', 'https://e.example.com/track');
    script.setAttribute('data-debug', 'true');
    document.body.appendChild(script);

    const tracker = autoInit()!;
    expect(tracker).toBeDefined();
    expect(window.SpecialistGTM).toBe(tracker);
    expect(window.sgtm).toBe(tracker);

    const events = subscribe(tracker);
    tracker.track('PageView');
    expect(events[0]?.trackKey).toBe('auto-key');
  });

  it('returns null when no script tag has data-key', () => {
    expect(autoInit()).toBeNull();
  });
});