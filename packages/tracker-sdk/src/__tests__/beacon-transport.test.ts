import type { TrackEvent } from '@specialist-gtm/shared-types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isBeaconSupported, sendViaBeacon } from '../index.js';

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

function stubSendBeacon(fn: () => boolean = () => true): ReturnType<typeof vi.fn> {
  const mock = vi.fn(fn);
  setSendBeacon(mock);
  return mock;
}

afterEach(() => {
  setSendBeacon(ORIGINAL_SEND_BEACON);
});

describe('sendViaBeacon', () => {
  it('returns true when the browser accepted the beacon', () => {
    const mock = stubSendBeacon(() => true);
    const result = sendViaBeacon('https://e.example.com/track', [makeEvent('PageView')]);
    expect(result).toBe(true);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('returns false when the browser rejects the payload', () => {
    const mock = stubSendBeacon(() => false);
    const result = sendViaBeacon('https://e.example.com/track', [makeEvent('PageView')]);
    expect(result).toBe(false);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('sends the events as a Blob with content-type application/json', () => {
    const mock = stubSendBeacon(() => true);
    sendViaBeacon('https://e.example.com/track', [makeEvent('PageView')]);
    const [url, blob] = mock.mock.calls[0]!;
    expect(url).toBe('https://e.example.com/track');
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe('application/json');
  });

  it('returns false when sendBeacon is not available', () => {
    setSendBeacon(undefined);
    expect(isBeaconSupported()).toBe(false);
    expect(sendViaBeacon('https://e.example.com/track', [makeEvent('PageView')])).toBe(false);
  });
});