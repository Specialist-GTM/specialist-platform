import type { TrackEvent } from '@specialist-gtm/shared-types';

export function isBeaconSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';
}

export function sendViaBeacon(url: string, events: TrackEvent[]): boolean {
  if (!isBeaconSupported()) {
    return false;
  }
  const body = JSON.stringify(events);
  const blob = new Blob([body], { type: 'application/json' });
  return navigator.sendBeacon(url, blob);
}