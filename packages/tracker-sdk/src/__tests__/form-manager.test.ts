import type { TrackEvent } from '@specialist-gtm/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FormManager, Tracker } from '../index.js';

function customData(event: TrackEvent): Record<string, unknown> {
  return (event.payload.custom_data ?? {}) as Record<string, unknown>;
}

const trackers: Tracker[] = [];

function subscribe(tracker: Tracker): TrackEvent[] {
  const events: TrackEvent[] = [];
  tracker.subscribe((event) => events.push(event));
  return events;
}

function newTracker(options: { trackForms?: boolean } = {}): Tracker {
  const tracker = new Tracker('test-key', options);
  trackers.push(tracker);
  return tracker;
}

function buildForm(
  id: string,
  name: string,
  action: string,
  fields: Array<[string, string]>,
): HTMLFormElement {
  const form = document.createElement('form');
  form.id = id;
  form.name = name;
  form.setAttribute('action', action);
  for (const [key, value] of fields) {
    const input = document.createElement('input');
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  return form;
}

function submit(form: HTMLFormElement): void {
  form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe('FormManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    trackers.length = 0;
  });

  afterEach(() => {
    for (const tracker of trackers) {
      tracker.stopFormTracking();
    }
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('emits a submission from a native form submit event', () => {
    const onSubmission = vi.fn();
    const manager = new FormManager(onSubmission);
    manager.start();

    const form = buildForm('form-lead', 'contato', '/api/lead', [
      ['nome', 'João Silva'],
      ['email', 'joao@exemplo.com'],
      ['telefone', '11999999999'],
    ]);
    submit(form);

    const submission = onSubmission.mock.calls[0]![0];
    expect(submission.source).toBe('submit');
    expect(submission.formId).toBe('form-lead');
    expect(submission.formName).toBe('contato');
    expect(submission.email).toBe('joao@exemplo.com');
    expect(submission.phone).toBe('11999999999');
    expect(submission.name).toBe('João Silva');
    manager.stop();
  });

  it('deduplicates repeated submits inside the window', () => {
    vi.useFakeTimers();
    const onSubmission = vi.fn();
    const manager = new FormManager(onSubmission);
    manager.start();

    const form = buildForm('f1', 'lead', '/api/lead', [
      ['email', 'joao@exemplo.com'],
      ['telefone', '11999999999'],
    ]);
    submit(form);
    submit(form);
    expect(onSubmission).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2001);
    submit(form);
    expect(onSubmission).toHaveBeenCalledTimes(2);
    manager.stop();
  });

  it('deduplicates a fetch submission with a following success mutation', async () => {
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);
    mock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const onSubmission = vi.fn();
    const manager = new FormManager(onSubmission);
    manager.start();
    const form = buildForm('f2', 'lead', '/api/lead', []);

    const body = new FormData();
    body.append('email', 'joao@exemplo.com');
    await fetch('/api/lead', { method: 'POST', body });
    await vi.waitFor(() => expect(onSubmission).toHaveBeenCalledTimes(1));
    expect(onSubmission.mock.calls[0]![0].source).toBe('fetch');

    const success = document.createElement('div');
    success.className = 'form-success';
    form.appendChild(success);
    await flush();
    expect(onSubmission).toHaveBeenCalledTimes(1);
    manager.stop();
  });

  it('emits the confirmed mutation as a submission', async () => {
    const onSubmission = vi.fn();
    const manager = new FormManager(onSubmission);
    manager.start();

    const form = buildForm('f3', 'lead', '/api/lead', []);
    const success = document.createElement('div');
    success.className = 'w-form-done';
    success.textContent = 'Pronto';
    form.appendChild(success);

    await vi.waitFor(() => expect(onSubmission).toHaveBeenCalledTimes(1));
    const submission = onSubmission.mock.calls[0]![0];
    expect(submission.source).toBe('mutation');
    expect(submission.selector).toBe('.w-form-done');
    expect(submission.message).toBe('Pronto');
    manager.stop();
  });

  it('emits a thank you page submission on start', () => {
    window.history.replaceState({}, '', '/obrigado');
    const onSubmission = vi.fn();
    const manager = new FormManager(onSubmission);
    manager.start();

    expect(onSubmission).toHaveBeenCalledTimes(1);
    const submission = onSubmission.mock.calls[0]![0];
    expect(submission.source).toBe('thank_you');
    expect(submission.fields).toEqual({});
    expect(submission.pattern).toBe('obrigado');
    manager.stop();
  });

  it('does not emit for regular pages', () => {
    window.history.replaceState({}, '', '/contato');
    const onSubmission = vi.fn();
    const manager = new FormManager(onSubmission);
    manager.start();

    expect(onSubmission).not.toHaveBeenCalled();
    manager.stop();
  });

  it('emits FormSubmit and Lead through the Tracker', () => {
    const tracker = newTracker();
    const events = subscribe(tracker);

    const form = buildForm('form-lead', 'contato', '/api/lead', [
      ['nome', 'João Silva'],
      ['email', 'joao@exemplo.com'],
      ['telefone', '11999999999'],
    ]);
    submit(form);

    expect(events.map((event) => event.payload.event_name)).toEqual(['FormSubmit', 'Lead']);
    const data = customData(events[0]!);
    expect(data.form_id).toBe('form-lead');
    expect(data.form_source).toBe('submit');
    expect(data.email).toBe('joao@exemplo.com');
    expect(data.phone).toBe('11999999999');
    expect(data.fields).toMatchObject({ nome: 'João Silva' });
  });

  it('does not track forms when trackForms is disabled', () => {
    const tracker = newTracker({ trackForms: false });
    const events = subscribe(tracker);

    submit(buildForm('f', 'lead', '/api/lead', [['email', 'joao@exemplo.com']]));
    expect(events).toHaveLength(0);

    tracker.startFormTracking();
    submit(document.querySelector<HTMLFormElement>('#f')!);
    expect(events.map((event) => event.payload.event_name)).toEqual(['FormSubmit', 'Lead']);
  });

  it('does not track forms after stopFormTracking', () => {
    const tracker = newTracker();
    const events = subscribe(tracker);
    tracker.stopFormTracking();

    submit(buildForm('f', 'lead', '/api/lead', [['email', 'joao@exemplo.com']]));
    expect(events).toHaveLength(0);
  });
});