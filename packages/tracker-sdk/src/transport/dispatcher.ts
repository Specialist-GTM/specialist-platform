import type { TrackEvent } from '@specialist-gtm/shared-types';

import { sendViaBeacon } from './beacon-transport.js';
import { EventQueue } from './event-queue.js';
import { sendViaFetch } from './fetch-transport.js';

export class Dispatcher {
  private readonly queue: EventQueue;
  private readonly onVisibilityChange: () => void;
  private readonly onPageHide: () => void;

  constructor(private readonly endpoint: string) {
    this.queue = new EventQueue((events) => this.send(events));
    this.onVisibilityChange = () => {
      if (typeof document === 'undefined') {
        return;
      }
      if (document.visibilityState === 'hidden') {
        this.queue.flushNow();
      }
    };
    this.onPageHide = () => {
      this.queue.flushNow();
    };
    this.installUnloadListener();
  }

  enqueue(event: TrackEvent): void {
    this.queue.enqueue(event);
  }

  async sendNow(event: TrackEvent): Promise<void> {
    if (sendViaBeacon(this.endpoint, [event])) {
      return;
    }
    await sendViaFetch(this.endpoint, [event]);
  }

  flushNow(): void {
    this.queue.flushNow();
  }

  destroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.onPageHide);
    }
    this.queue.flushNow();
  }

  private send(events: TrackEvent[]): void {
    if (sendViaBeacon(this.endpoint, events)) {
      return;
    }
    void sendViaFetch(this.endpoint, events);
  }

  private installUnloadListener(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.onPageHide);
    }
  }
}