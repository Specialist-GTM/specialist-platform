import { extractRequestBody } from './fetch-interceptor.js';
import type { ExtractedFormData } from './field-extractor.js';

type XhrState = { method: string; url: string };

type XhrOpen = (
  this: XMLHttpRequest,
  method: string,
  url: string | URL,
  async: boolean,
  username?: string | null,
  password?: string | null,
) => void;

export class XhrInterceptor {
  private originalOpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalSend: typeof XMLHttpRequest.prototype.send | null = null;
  private readonly states = new WeakMap<XMLHttpRequest, XhrState>();
  private active = false;

  constructor(private readonly callback: (data: ExtractedFormData) => void) {}

  start(): void {
    if (typeof XMLHttpRequest === 'undefined' || this.active) {
      return;
    }
    const prototype = XMLHttpRequest.prototype;
    const originalOpen = prototype.open as XhrOpen;
    const originalSend = prototype.send;
    this.originalOpen = prototype.open;
    this.originalSend = prototype.send;
    this.active = true;

    const states = this.states;
    const callback = this.callback;

    prototype.open = (function (this: XMLHttpRequest, method: string, url: string | URL, async: boolean, username?: string | null, password?: string | null): void {
      states.set(this, { method: method.toUpperCase(), url: String(url) });
      originalOpen.call(this, method, url, async ?? true, username, password);
    }) as typeof prototype.open;

    prototype.send = function send(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null): void {
      const state = states.get(this);
      this.addEventListener('load', () => {
        if (state === undefined) {
          return;
        }
        if (this.status < 200 || this.status >= 300) {
          return;
        }
        if (state.method !== 'POST' && state.method !== 'PUT' && state.method !== 'PATCH') {
          return;
        }
        const data = extractRequestBody(body ?? null);
        if (data === null) {
          return;
        }
        callback(data);
      });
      originalSend.call(this, body);
    };
  }

  stop(): void {
    if (!this.active || typeof XMLHttpRequest === 'undefined') {
      return;
    }
    const prototype = XMLHttpRequest.prototype;
    if (this.originalOpen !== null) {
      prototype.open = this.originalOpen as typeof XMLHttpRequest.prototype.open;
    }
    if (this.originalSend !== null) {
      prototype.send = this.originalSend as typeof XMLHttpRequest.prototype.send;
    }
    this.originalOpen = null;
    this.originalSend = null;
    this.active = false;
  }
}