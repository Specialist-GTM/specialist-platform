import { afterEach, describe, expect, it, vi } from 'vitest';

import { XhrInterceptor } from '../index.js';

type LoadListener = (this: { status: number }) => void;

class FakeXHR {
  status = 0;
  private readonly loadListeners: LoadListener[] = [];

  open(method: string, url: string): void {
    void method;
    void url;
  }

  addEventListener(type: string, handler: LoadListener): void {
    if (type === 'load') {
      this.loadListeners.push(handler);
    }
  }

  send(body: Document | XMLHttpRequestBodyInit | null | undefined): void {
    void body;
    queueMicrotask(() => {
      this.status = 200;
      for (const handler of this.loadListeners) {
        handler.call(this);
      }
    });
  }
}

function formBody(fields: Record<string, string>): FormData {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    body.append(key, value);
  }
  return body;
}

describe('XhrInterceptor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('extracts form fields from an XHR POST', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    const onSuccess = vi.fn();
    const interceptor = new XhrInterceptor(onSuccess);
    interceptor.start();

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/lead');
    xhr.send(formBody({ email: 'joao@exemplo.com', telefone: '11999999999', nome: 'João' }));
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    const data = onSuccess.mock.calls[0]![0];
    expect(data.email).toBe('joao@exemplo.com');
    expect(data.phone).toBe('11999999999');
    expect(data.fields).toEqual({
      email: 'joao@exemplo.com',
      telefone: '11999999999',
      nome: 'João',
    });

    interceptor.stop();
  });

  it('does not track GET requests', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    const onSuccess = vi.fn();
    const interceptor = new XhrInterceptor(onSuccess);
    interceptor.start();

    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/lead');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSuccess).not.toHaveBeenCalled();
    interceptor.stop();
  });

  it('does not track after stop', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    const onSuccess = vi.fn();
    const interceptor = new XhrInterceptor(onSuccess);
    interceptor.start();
    interceptor.stop();

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/lead');
    xhr.send(formBody({ email: 'a@b.com' }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSuccess).not.toHaveBeenCalled();
  });
});