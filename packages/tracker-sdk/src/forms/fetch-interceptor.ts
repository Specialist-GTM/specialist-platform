import { extractFormFields } from './field-extractor.js';
import type { ExtractedFormData } from './field-extractor.js';

export class FetchInterceptor {
  private originalFetch: typeof window.fetch | null = null;

  constructor(private readonly callback: (data: ExtractedFormData) => void) {}

  start(): void {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
      return;
    }
    if (this.originalFetch !== null) {
      return;
    }

    const original = window.fetch;
    this.originalFetch = original;

    const callback = this.callback;

    const wrapped = function (
      this: unknown,
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const context = this ?? window;
      return original.call(context, input, init).then(async (response: Response) => {
        if (!response.ok || init === undefined || init.body === null || init.body === undefined) {
          return response;
        }
        const method = (init.method ?? 'GET').toUpperCase();
        if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') {
          return response;
        }
        if (!(await isSuccessResponse(response))) {
          return response;
        }
        const data = extractRequestBody(init.body);
        if (data !== null) {
          callback(data);
        }
        return response;
      });
    };

    window.fetch = wrapped as typeof window.fetch;
  }

  stop(): void {
    if (this.originalFetch === null || typeof window === 'undefined') {
      return;
    }
    window.fetch = this.originalFetch;
    this.originalFetch = null;
  }
}

export function extractRequestBody(body: unknown): ExtractedFormData | null {
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const data = extractFormFields(body);
    return hasFields(data) ? data : null;
  }
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    const data = extractFormFields(Object.fromEntries(body.entries()));
    return hasFields(data) ? data : null;
  }
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (isRecord(parsed)) {
          const data = extractFormFields(parsed);
          return hasFields(data) ? data : null;
        }
      } catch {
        return null;
      }
    } else if (trimmed.includes('=')) {
      const data = extractFormFields(Object.fromEntries(new URLSearchParams(trimmed).entries()));
      return hasFields(data) ? data : null;
    }
  }
  return null;
}

async function isSuccessResponse(response: Response): Promise<boolean> {
  try {
    const clone = response.clone();
    const body: unknown = await clone.json();
    if (isRecord(body) && typeof body.success === 'boolean') {
      return body.success;
    }
  } catch {
    return true;
  }
  return true;
}

function hasFields(data: ExtractedFormData): boolean {
  return Object.keys(data.fields).length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}