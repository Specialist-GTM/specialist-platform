import type { TrackEvent } from '@specialist-gtm/shared-types';

export interface TrackerOptions {
  endpoint?: string;
}

type Subscriber = (event: TrackEvent) => void;

let counter = 0;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  counter += 1;
  return `evt_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export class Tracker {
  private readonly trackKey: string;
  private readonly endpoint?: string;
  private readonly subscribers: Subscriber[] = [];

  constructor(trackKey: string, options: TrackerOptions = {}) {
    this.trackKey = trackKey;
    this.endpoint = options.endpoint;
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.push(subscriber);
    return () => {
      const index = this.subscribers.indexOf(subscriber);
      if (index >= 0) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  track(payload: Record<string, unknown>): void {
    const event: TrackEvent = {
      id: generateId(),
      trackKey: this.trackKey,
      occurredAt: new Date().toISOString(),
      payload,
    };

    for (const subscriber of this.subscribers) {
      subscriber(event);
    }

    void this.dispatch(event);
  }

  private async dispatch(event: TrackEvent): Promise<void> {
    if (this.endpoint === undefined) {
      return;
    }
    await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
    });
  }
}
