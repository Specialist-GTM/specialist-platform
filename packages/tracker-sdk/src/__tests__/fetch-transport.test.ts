import type { TrackEvent } from '@specialist-gtm/shared-types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendViaFetch } from '../index.js';

function makeEvent(name: string, bigData = ''): TrackEvent {
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
      custom_data: bigData.length > 0 ? { big: bigData } : {},
    },
  };
}

const ORIGINAL_FETCH = (globalThis as { fetch: typeof fetch }).fetch;

afterEach(() => {
  vi.unstubAllGlobals();
  (globalThis as { fetch: typeof fetch }).fetch = ORIGINAL_FETCH;
});

describe('sendViaFetch', () => {
  it('posts the events with keepalive for payloads under the limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const events = [makeEvent('PageView'), makeEvent('Click')];
    const ok = await sendViaFetch('https://e.example.com/track', events);

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://e.example.com/track');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(init?.keepalive).toBe(true);
    expect(JSON.parse(init?.body as string)).toEqual(events);
  });

  it('disables keepalive for payloads above 60KB', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const big = 'x'.repeat(70_000);
    const ok = await sendViaFetch(
      'https://e.example.com/track',
      [makeEvent('PageView', big)],
    );

    expect(ok).toBe(true);
    const init = fetchMock.mock.calls[0]![1]!;
    expect(init.keepalive).toBe(false);
  });

  it('returns false when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const ok = await sendViaFetch('https://e.example.com/track', [makeEvent('PageView')]);
    expect(ok).toBe(false);
  });

  it('returns false when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    const ok = await sendViaFetch('https://e.example.com/track', [makeEvent('PageView')]);
    expect(ok).toBe(false);
  });

  it('accepts 204 as a success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const ok = await sendViaFetch('https://e.example.com/track', [makeEvent('PageView')]);
    expect(ok).toBe(true);
  });
});