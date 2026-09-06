import type { TrackEvent } from '@specialist-gtm/shared-types';

export const DEFAULT_MAX_BATCH_SIZE = 10;
export const DEFAULT_FLUSH_INTERVAL_MS = 500;

export interface QueueOptions {
  maxBatchSize?: number;
  flushIntervalMs?: number;
}

export class EventQueue {
  private queue: TrackEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly flush: (events: TrackEvent[]) => void | Promise<void>,
    private readonly options: QueueOptions = {},
  ) {}

  enqueue(event: TrackEvent): void {
    this.queue.push(event);
    if (this.queue.length >= (this.options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE)) {
      this.flushNow();
      return;
    }
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(
        () => this.flushNow(),
        this.options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
      );
    }
  }

  flushNow(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.queue.length === 0) {
      return;
    }
    const batch = this.queue.splice(0);
    this.flush(batch);
  }
}