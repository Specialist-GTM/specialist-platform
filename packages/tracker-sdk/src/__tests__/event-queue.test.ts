import type { TrackEvent } from '@specialist-gtm/shared-types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventQueue } from '../index.js';

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

afterEach(() => {
  vi.useRealTimers();
});

describe('EventQueue', () => {
  it('flushes automatically after the interval', async () => {
    vi.useFakeTimers();
    const flush = vi.fn();
    const queue = new EventQueue(flush, { flushIntervalMs: 500 });

    queue.enqueue(makeEvent('PageView'));
    expect(flush).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(499);
    expect(flush).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush.mock.calls[0]![0]).toEqual([expect.objectContaining({ id: 'id-PageView' })]);
  });

  it('flushes immediately when the batch reaches maxBatchSize', () => {
    vi.useFakeTimers();
    const flush = vi.fn();
    const queue = new EventQueue(flush, { maxBatchSize: 3, flushIntervalMs: 500 });

    queue.enqueue(makeEvent('A'));
    queue.enqueue(makeEvent('B'));
    expect(flush).not.toHaveBeenCalled();

    queue.enqueue(makeEvent('C'));
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush.mock.calls[0]![0]).toHaveLength(3);
  });

  it('clears the pending timer when it flushes manually', async () => {
    vi.useFakeTimers();
    const flush = vi.fn();
    const queue = new EventQueue(flush, { flushIntervalMs: 500 });

    queue.enqueue(makeEvent('A'));
    queue.flushNow();
    expect(flush).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('does not flush when the queue is empty', () => {
    vi.useFakeTimers();
    const flush = vi.fn();
    const queue = new EventQueue(flush, { flushIntervalMs: 500 });

    queue.flushNow();
    expect(flush).not.toHaveBeenCalled();
  });

  it('does not lose events enqueued after a flush starts', () => {
    vi.useFakeTimers();
    const flush = vi.fn();
    const queue = new EventQueue(flush, { flushIntervalMs: 500 });

    queue.enqueue(makeEvent('A'));
    queue.flushNow();
    expect(flush.mock.calls[0]![0]).toEqual([expect.objectContaining({ id: 'id-A' })]);

    queue.enqueue(makeEvent('B'));
    queue.flushNow();
    expect(flush).toHaveBeenCalledTimes(2);
    expect(flush.mock.calls[1]![0]).toEqual([expect.objectContaining({ id: 'id-B' })]);
  });

  it('resets the batch counter after a successful flush', async () => {
    vi.useFakeTimers();
    const flush = vi.fn();
    const queue = new EventQueue(flush, { maxBatchSize: 2, flushIntervalMs: 500 });

    queue.enqueue(makeEvent('A'));
    queue.enqueue(makeEvent('B'));
    expect(flush).toHaveBeenCalledTimes(1);

    queue.enqueue(makeEvent('C'));
    queue.enqueue(makeEvent('D'));
    expect(flush).toHaveBeenCalledTimes(2);
    expect(flush.mock.calls[1]![0]).toEqual([
      expect.objectContaining({ id: 'id-C' }),
      expect.objectContaining({ id: 'id-D' }),
    ]);
  });
});