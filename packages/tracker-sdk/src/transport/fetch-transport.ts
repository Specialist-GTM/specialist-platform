import type { TrackEvent } from '@specialist-gtm/shared-types';

const KEEPALIVE_MAX_BYTES = 61_440;

export async function sendViaFetch(url: string, events: TrackEvent[]): Promise<boolean> {
  const body = JSON.stringify(events);
  const options: RequestInit = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: body.length <= KEEPALIVE_MAX_BYTES,
  };
  try {
    const response = await fetch(url, options);
    return response.ok || response.status === 204;
  } catch {
    return false;
  }
}