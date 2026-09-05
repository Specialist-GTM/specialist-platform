import type { TrackEvent } from '@specialist-gtm/shared-types';

export interface DispatcherSender {
  (event: TrackEvent): Promise<void>;
}

export class Dispatcher {
  private readonly sender: DispatcherSender;
  private readonly queue: TrackEvent[] = [];
  private running = false;

  constructor(sender: DispatcherSender) {
    this.sender = sender;
  }

  enqueue(event: TrackEvent): void {
    this.queue.push(event);
  }

  get size(): number {
    return this.queue.length;
  }

  async drain(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      while (this.queue.length > 0) {
        const event = this.queue.shift();
        if (event !== undefined) {
          await this.sender(event);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
