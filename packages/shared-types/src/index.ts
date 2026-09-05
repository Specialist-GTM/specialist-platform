export const PLATFORM_VERSION = '0.1.0';

export interface TrackEvent {
  id: string;
  trackKey: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface TrackEventEnvelope {
  id: string;
  version: 1;
  clientKey: string;
  event: TrackEvent;
}
