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

export * from './schemas/tracker.js';
export * from './schemas/user.js';
export * from './schemas/context.js';
export * from './schemas/destinations.js';
export * from './schemas/container.js';
export * from './schemas/envelope.js';
export * from './validation/validator.js';