import { afterEach, describe, expect, it, vi } from 'vitest';

import { FetchInterceptor, extractRequestBody } from '../index.js';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function formBody(fields: Record<string, string>): FormData {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    body.append(key, value);
  }
  return body;
}

describe('FetchInterceptor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('extracts form fields from a POST fetch with FormData body', async () => {
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);
    mock.mockResolvedValue(jsonResponse({ success: true }));

    const onSuccess = vi.fn();
    const interceptor = new FetchInterceptor(onSuccess);
    interceptor.start();

    await fetch('/api/lead', {
      method: 'POST',
      body: formBody({ email: 'joao@exemplo.com', telefone: '(11) 99999-9999', nome: 'João' }),
    });
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    const data = onSuccess.mock.calls[0]![0];
    expect(data.email).toBe('joao@exemplo.com');
    expect(data.phone).toBe('11999999999');
    expect(data.name).toBe('João');
    expect(data.fields).toEqual({
      email: 'joao@exemplo.com',
      telefone: '(11) 99999-9999',
      nome: 'João',
    });

    interceptor.stop();
    expect(window.fetch).toBe(mock);
  });

  it('does not track success:false responses', async () => {
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);
    mock.mockResolvedValue(jsonResponse({ success: false }));

    const onSuccess = vi.fn();
    const interceptor = new FetchInterceptor(onSuccess);
    interceptor.start();

    await fetch('/api/lead', { method: 'POST', body: formBody({ email: 'joao@exemplo.com' }) });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSuccess).not.toHaveBeenCalled();
    interceptor.stop();
  });

  it('does not track GET requests', async () => {
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);
    mock.mockResolvedValue(jsonResponse({ success: true }));

    const onSuccess = vi.fn();
    const interceptor = new FetchInterceptor(onSuccess);
    interceptor.start();

    await fetch('/api/lead');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSuccess).not.toHaveBeenCalled();
    interceptor.stop();
  });

  it('does not track non-2xx responses', async () => {
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);
    mock.mockResolvedValue(jsonResponse({ success: false }, 500));

    const onSuccess = vi.fn();
    const interceptor = new FetchInterceptor(onSuccess);
    interceptor.start();

    await fetch('/api/lead', { method: 'POST', body: formBody({ email: 'a@b.com' }) });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSuccess).not.toHaveBeenCalled();
    interceptor.stop();
  });

  it('does not track after stop', async () => {
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);
    mock.mockResolvedValue(jsonResponse({ success: true }));

    const onSuccess = vi.fn();
    const interceptor = new FetchInterceptor(onSuccess);
    interceptor.start();
    interceptor.stop();

    await fetch('/api/lead', { method: 'POST', body: formBody({ email: 'a@b.com' }) });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('extractRequestBody', () => {
  it('parses JSON bodies', () => {
    const data = extractRequestBody(JSON.stringify({ email: 'a@b.com', nome: 'Ana' }));
    expect(data).toEqual({
      fields: { email: 'a@b.com', nome: 'Ana' },
      email: 'a@b.com',
      name: 'Ana',
    });
  });

  it('parses URLSearchParams bodies', () => {
    const data = extractRequestBody(new URLSearchParams({ email: 'a@b.com', telefone: '11988887777' }));
    expect(data).toEqual({
      fields: { email: 'a@b.com', telefone: '11988887777' },
      email: 'a@b.com',
      phone: '11988887777',
    });
  });

  it('returns null for non-form payloads', () => {
    expect(extractRequestBody('just a string')).toBeNull();
    expect(extractRequestBody(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});