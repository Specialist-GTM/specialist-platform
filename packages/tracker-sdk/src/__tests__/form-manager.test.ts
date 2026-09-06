import type { TrackEvent } from '@specialist-gtm/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FormManager, Tracker } from '../index.js';

const HEX_64 = /^[a-f0-9]{64}$/;

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

  it('emits a hashed submission from a native form submit event', async () => {
    const onSubmission = vi.fn();
    const manager = new FormManager(onSubmission);
    manager.start();

    const form = buildForm('form-lead', 'contato', '/api/lead', [
      ['nome', 'João Silva'],
      ['email', 'joao@exemplo.com'],
      ['telefone', '11999999999'],
    ]);
    submit(form);

    await vi.waitFor(() => expect(onSubmission).toHaveBeenCalledTimes(1));
    const submission = onSubmission.mock.calls[0]![0];
    expect(submission.source).toBe('submit');
    expect(submission.formId).toBe('form-lead');
    expect(submission.formName).toBe('contato');
    expect(submission.email).toBe('joao@exemplo.com');
    expect(submission.phone).toBe('11999999999');
    expect(submission.name).toBe('João Silva');
    expect(submission.hashed.em).toBe('7f32bc621b0f045c9ee21cd6a74bd09b3478062ab8f71e215ac1d201b702b0e9');
    expect(submission.hashed.email_hash).toBe(submission.hashed.em);
    expect(submission.hashed.ph).toBe('a869177964cc68954ffec997bbad30769f8a5a6fdc60f296ddbc60b9347dc416');
    expect(submission.hashed.fn).toBe('ed2befb11499489e2570cb053f774b8ed93e89eddab3f78867a2a5f32c58845e');
    expect(submission.hashed.ln).toBe('d24e913a4107af875dc2ac3d419798f3794d00434e5059fbb68ac8d33626eaee');
    manager.stop();
  });

  it('does not attach hashed data when there is no PII', async () => {
    const onSubmission = vi.fn();
    const manager = new FormManager(onSubmission);
    manager.start();

    submit(buildForm('f0', 'lead', '/api/lead', [['mensagem', 'Olá']]));

    await vi.waitFor(() => expect(onSubmission).toHaveBeenCalledTimes(1));
    expect(onSubmission.mock.calls[0]![0].hashed).toBeUndefined();
    manager.stop();
  });

  it('deduplicates repeated submits inside the window', async () => {
    vi.useFakeTimers();
    const onSubmission = vi.fn();
    const manager = new FormManager(onSubmission);
    manager.start();

    const form = buildForm('f1', 'lead', '/api/lead', [
      ['email', 'joao@exemplo.com'],
      ['telefone', '11999999999'],
    ]);
    submit(form);
    await vi.waitFor(() => expect(onSubmission).toHaveBeenCalledTimes(1));

    submit(form);
    await vi.advanceTimersByTimeAsync(10);
    expect(onSubmission).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2001);
    submit(form);
    await vi.waitFor(() => expect(onSubmission).toHaveBeenCalledTimes(2));

    expect(onSubmission.mock.calls[1]![0].source).toBe('submit');
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

  it('emits a thank you page submission on start', async () => {
    window.history.replaceState({}, '', '/obrigado');
    const onSubmission = vi.fn();
    const manager = new FormManager(onSubmission);
    manager.start();

    await vi.waitFor(() => expect(onSubmission).toHaveBeenCalledTimes(1));
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

  it('emits FormSubmit and Lead without plaintext PII and with user_data', async () => {
    const tracker = newTracker();
    const events = subscribe(tracker);

    const form = buildForm('form-lead', 'contato', '/api/lead', [
      ['nome', 'João Silva'],
      ['email', 'joao@exemplo.com'],
      ['telefone', '11999999999'],
      ['mensagem', 'Olá'],
    ]);
    submit(form);

    await vi.waitFor(() => expect(events.length).toBe(2));
    const data = customData(events[0]!);
    expect(events.map((event) => event.payload.event_name)).toEqual(['FormSubmit', 'Lead']);
    expect(data.form_id).toBe('form-lead');
    expect(data.form_source).toBe('submit');
    expect(data.email).toBeUndefined();
    expect(data.phone).toBeUndefined();
    expect(data.name).toBeUndefined();
    expect(data.fields).toEqual({ mensagem: 'Olá' });

    const userData = data.user_data as Record<string, string>;
    expect(userData.em).toMatch(HEX_64);
    expect(userData.email_hash).toBe(userData.em);
    expect(userData.ph).toMatch(HEX_64);
    expect(userData.phone_number_hash).toBe(userData.ph);
    expect(userData.fn).toMatch(HEX_64);
    expect(userData.ln).toMatch(HEX_64);

    const payload = JSON.stringify(events[0]!.payload);
    expect(payload).not.toContain('joao@exemplo.com');
    expect(payload).not.toContain('11999999999');
    expect(payload).not.toContain('João Silva');
  });

  it('never exposes sensitive fields like password in the payload', async () => {
    const tracker = newTracker();
    const events = subscribe(tracker);

    const form = buildForm('f-sec', 'login', '/api/login', [
      ['email', 'joao@exemplo.com'],
      ['password', 'hunter2'],
      ['card_number', '4111111111111111'],
      ['cvv', '123'],
    ]);
    submit(form);

    await vi.waitFor(() => expect(events.length).toBe(2));
    const payload = JSON.stringify(events[0]!.payload);
    expect(payload).not.toContain('4111111111111111');
    expect(payload).not.toContain('hunter2');
    expect(payload).not.toContain('123');
    expect(payload).not.toContain('joao@exemplo.com');

    const userData = customData(events[0]!).user_data as Record<string, string>;
    expect(userData).not.toHaveProperty('password_hash');
    expect(userData).not.toHaveProperty('card_hash');
  });

  it('does not track forms when trackForms is disabled', async () => {
    const tracker = newTracker({ trackForms: false });
    const events = subscribe(tracker);

    submit(buildForm('f', 'lead', '/api/lead', [['email', 'joao@exemplo.com']]));
    expect(events).toHaveLength(0);

    tracker.startFormTracking();
    submit(document.querySelector<HTMLFormElement>('#f')!);
    await vi.waitFor(() => expect(events.length).toBe(2));
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