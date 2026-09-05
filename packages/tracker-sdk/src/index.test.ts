import { describe, expect, it } from 'vitest';

import { Tracker } from './index.js';

describe('Tracker', () => {
  it('notifies subscribers synchronously', () => {
    const tracker = new Tracker('test-key');
    const seen: unknown[] = [];
    tracker.subscribe((event) => seen.push(event.payload));
    tracker.track({ page: '/' });
    expect(seen).toEqual([{ page: '/' }]);
  });

  it('stops notifying after unsubscribe', () => {
    const tracker = new Tracker('test-key');
    let calls = 0;
    const unsubscribe = tracker.subscribe(() => {
      calls += 1;
    });
    unsubscribe();
    tracker.track({ page: '/' });
    expect(calls).toBe(0);
  });

  it('does not require an endpoint', () => {
    const tracker = new Tracker('test-key');
    tracker.track({ page: '/' });
  });
});
