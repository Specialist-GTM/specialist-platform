import type { TrackEvent } from '@specialist-gtm/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Dispatcher } from '../index.js';

function makeEvent(name: string): TrackEvent {
  return {
    id: `id-${name}`,
    trackKey: 'key',
    occurredAt: new Date().toISOString(),
    payload: {
      event_name: name,
      event_id: `id-${name}`,
      url: 'https://example.com/',
      referrer: null,
      timestamp: 123,
      custom_data: {},
    },
  };
}

const ORIGINAL_SEND_BEACON = navigator.sendBeacon;

function setSendBeacon(value: typeof navigator.sendBeacon | undefined): void {
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    writable: true,
    value,
  });
}

function stubSendBeacon(fn: () => boolean = () => false): ReturnType<typeof vi.fn> {
  const mock = vi.fn(fn);
  setSendBeacon(mock);
  return mock;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setSendBeacon(ORIGINAL_SEND_BEACON);
});

describe('Dispatcher', () => {
  it('uses sendBeacon when it accepts the payload', async () => {
    const beacon = stubSendBeacon(() => true);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const dispatcher = new Dispatcher('https://e.example.com/track');
    dispatcher.enqueue(makeEvent('A'));
    await vi.advanceTimersByTimeAsync(500);

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    dispatcher.destroy();
  });

  it('falls back to fetch keepalive when sendBeacon is unavailable', async () => {
    setSendBeacon(undefined);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const dispatcher = new Dispatcher('https://e.example.com/track');
    dispatcher.enqueue(makeEvent('A'));
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]![1]!;
    expect(init.keepalive).toBe(true);
    dispatcher.destroy();
  });

  it('batches rapid events into a single request', async () => {
    stubSendBeacon(() => false);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const dispatcher = new Dispatcher('https://e.example.com/track');
    dispatcher.enqueue(makeEvent('A'));
    dispatcher.enqueue(makeEvent('B'));
    dispatcher.enqueue(makeEvent('C'));
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as TrackEvent[];
    expect(body.map((event) => event.payload.event_name)).toEqual(['A', 'B', 'C']);
    dispatcher.destroy();
  });

  it('forces an immediate flush when the page becomes hidden', async () => {
    stubSendBeacon(() => false);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const dispatcher = new Dispatcher('https://e.example.com/track');
    dispatcher.enqueue(makeEvent('A'));

    delete (document as { visibilityState?: string }).visibilityState;
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    dispatcher.destroy();
  });

  it('forces an immediate flush on pagehide', async () => {
    stubSendBeacon(() => false);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const dispatcher = new Dispatcher('https://e.example.com/track');
    dispatcher.enqueue(makeEvent('A'));

    window.dispatchEvent(new Event('pagehide'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    dispatcher.destroy();
  });

  it('stops flushing after destroy', async () => {
    stubSendBeacon(() => false);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const dispatcher = new Dispatcher('https://e.example.com/track');
    dispatcher.enqueue(makeEvent('A'));
    dispatcher.destroy();

    expect(fetchMock).toHaveBeenCalledTimes(1); // destroy() forcibly flushes

    window.dispatchEvent(new Event('pagehide'));
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sendNow dispatches immediately and awaits delivery', async () => {
    stubSendBeacon(() => false);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const dispatcher = new Dispatcher('https://e.example.com/track');
    await dispatcher.sendNow(makeEvent('A'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as TrackEvent[];
    expect(body).toHaveLength(1);
    dispatcher.destroy();
  });
});