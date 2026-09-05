import { describe, expect, it } from 'vitest';

import {
  ContainerConfigSchema,
  ContextPayloadSchema,
  Sha256HashSchema,
  TrackerPayloadSchema,
  UnifiedEventEnvelopeSchema,
  UserDataPayloadSchema,
  UtmParamsSchema,
  validatePayload,
} from './index.js';
import type { TrackEvent, TrackEventEnvelope } from './index.js';

const VALID_SHA256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('TrackerPayloadSchema', () => {
  it('validates a complete payload with defaults', () => {
    const result = TrackerPayloadSchema.safeParse({
      event_name: 'PageView',
      event_id: 'evt_123',
      url: 'https://example.com/home',
      referrer: null,
      timestamp: 1726000000000,
      custom_data: { key: 'value' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.custom_data).toEqual({ key: 'value' });
    }
  });

  it('applies empty object default to custom_data', () => {
    const result = TrackerPayloadSchema.safeParse({
      event_name: 'PageView',
      event_id: 'evt_123',
      url: 'https://example.com',
      timestamp: '2024-09-10T12:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.custom_data).toEqual({});
    }
  });

  it('rejects missing required fields', () => {
    const result = TrackerPayloadSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid timestamp', () => {
    const result = TrackerPayloadSchema.safeParse({
      event_name: 'PageView',
      event_id: 'evt_123',
      url: 'https://example.com',
      timestamp: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative timestamp', () => {
    const result = TrackerPayloadSchema.safeParse({
      event_name: 'PageView',
      event_id: 'evt_123',
      url: 'https://example.com',
      timestamp: -5,
    });
    expect(result.success).toBe(false);
  });
});

describe('UserDataPayloadSchema', () => {
  it('validates all PII hashes and identifiers', () => {
    const result = UserDataPayloadSchema.safeParse({
      em_hash: VALID_SHA256,
      ph_hash: VALID_SHA256,
      fn_hash: VALID_SHA256,
      ln_hash: VALID_SHA256,
      fbp: 'fb.1.1234',
      fbc: 'fb.1.5678',
      client_id: 'ga4-client-id-123',
      external_id: 'lead@example.com',
      lead_id: 'lead_42',
      gclid: 'gclid_1',
      ttclid: 'ttclid_1',
    });
    expect(result.success).toBe(true);
  });

  it('passes through unknown fields', () => {
    const result = UserDataPayloadSchema.safeParse({ partner_tracking: 'x' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.partner_tracking).toBe('x');
    }
  });

  it('accepts null and missing identifiers', () => {
    const result = UserDataPayloadSchema.safeParse({ em_hash: null, fbp: null });
    expect(result.success).toBe(true);
  });
});

describe('Sha256HashSchema', () => {
  it('accepts lowercase 64-char hex hashes', () => {
    expect(Sha256HashSchema.safeParse(VALID_SHA256).success).toBe(true);
  });

  it('accepts uppercase hex hashes', () => {
    expect(Sha256HashSchema.safeParse(VALID_SHA256.toUpperCase()).success).toBe(true);
  });

  it('rejects invalid hash strings', () => {
    for (const value of ['short', 'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg', '', 123]) {
      expect(Sha256HashSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe('ContextPayloadSchema', () => {
  it('validates full context with UTM params', () => {
    const result = ContextPayloadSchema.safeParse({
      ip: '192.168.0.1',
      user_agent: 'Mozilla/5.0',
      locale: 'pt-BR',
      screen_resolution: '1920x1080',
      session_id: 'sess_1',
      utms: { utm_source: 'google', utm_campaign: 'launch' },
      cookies: { _fbp: 'fb.1.1234' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.utms).toEqual({ utm_source: 'google', utm_campaign: 'launch' });
    }
  });

  it('applies defaults for utms and cookies', () => {
    const result = ContextPayloadSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.utms).toEqual({});
      expect(result.data.cookies).toEqual({});
    }
  });
});

describe('UtmParamsSchema', () => {
  it('validates partial UTM params', () => {
    const result = UtmParamsSchema.safeParse({ utm_medium: 'cpc' });
    expect(result.success).toBe(true);
  });
});

describe('ContainerConfigSchema', () => {
  const base = {
    container_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    data_key: 'dk_prod',
    domain: 'example.com',
  };

  it('validates minimal config with default rules and empty destinations', () => {
    const result = ContainerConfigSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rules.track_whatsapp_clicks).toBe(true);
      expect(result.data.rules.auto_hash_pii).toBe(true);
      expect(result.data.destinations).toEqual({});
    }
  });

  it('validates a fully configured container', () => {
    const result = ContainerConfigSchema.safeParse({
      ...base,
      rules: { track_forms: false },
      destinations: {
        meta: {
          enabled: true,
          pixel_id: '123456',
          access_token: 'EAAG-xxx',
          test_event_code: 'TEST12345',
        },
        ga4: { enabled: true, measurement_id: 'G-XXXXXXX', api_secret: 'secret' },
        google_ads: { enabled: true, conversion_id: 'AW-123', conversion_label: 'abc' },
        tiktok: { enabled: false, pixel_code: 'C0PXXX', access_token: 'tok' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for container_id', () => {
    const result = ContainerConfigSchema.safeParse({ ...base, container_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing destination credentials', () => {
    const result = ContainerConfigSchema.safeParse({
      ...base,
      destinations: { meta: { enabled: true, access_token: 'x' } },
    });
    expect(result.success).toBe(false);
  });
});

describe('UnifiedEventEnvelopeSchema', () => {
  const tracker = {
    event_name: 'LeadSubmitted',
    event_id: 'evt_1',
    url: 'https://example.com/contato',
    timestamp: 1726000000000,
  };

  it('validates a complete envelope', () => {
    const result = UnifiedEventEnvelopeSchema.safeParse({
      data_key: 'dk_prod',
      container_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      received_at: '2024-09-10T12:00:00.000Z',
      tracker,
      user_data: { em_hash: VALID_SHA256 },
      context: { locale: 'pt-BR', utms: { utm_source: 'google' } },
    });
    expect(result.success).toBe(true);
  });

  it('requires tracker and data_key', () => {
    const result = UnifiedEventEnvelopeSchema.safeParse({ tracker });
    expect(result.success).toBe(false);
  });

  it('applies defaults to user_data and context', () => {
    const result = UnifiedEventEnvelopeSchema.safeParse({ data_key: 'dk_prod', tracker });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user_data).toEqual({});
      expect(result.data.context).toEqual({ utms: {}, cookies: {} });
    }
  });
});

describe('validatePayload', () => {
  it('returns { success: true, data } for valid payloads', () => {
    const result = validatePayload(TrackerPayloadSchema, {
      event_name: 'PageView',
      event_id: 'evt_1',
      url: 'https://example.com',
      timestamp: 1726000000000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.event_name).toBe('PageView');
    }
  });

  it('returns friendly structured errors with paths for invalid payloads', () => {
    const result = validatePayload(TrackerPayloadSchema, {
      event_name: 'PageView',
      event_id: '',
      url: '',
      timestamp: -5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const byPath = Object.fromEntries(result.errors.map((e) => [e.path, e]));
      expect(byPath['event_id']?.code).toBe('too_small');
      expect(byPath['timestamp']?.code).toBe('too_small');
      expect(byPath['url']?.code).toBe('invalid_string');
      expect(result.errors.every((e) => e.message.length > 0)).toBe(true);
    }
  });

  it('returns invalid_type error for missing required fields', () => {
    const result = validatePayload(UnifiedEventEnvelopeSchema, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.code === 'invalid_type')).toBe(true);
    }
  });
});

describe('Legacy type compatibility', () => {
  it('keeps TrackEvent and TrackEventEnvelope contracts intact', () => {
    const trackEvent: TrackEvent = {
      id: 'evt_1',
      trackKey: 'page_view',
      occurredAt: '2024-09-10T12:00:00.000Z',
      payload: { url: 'https://example.com' },
    };
    const envelope: TrackEventEnvelope = {
      id: 'env_1',
      version: 1,
      clientKey: 'client_1',
      event: trackEvent,
    };
    expect(envelope.version).toBe(1);
    expect(envelope.event.payload.url).toBe('https://example.com');
  });
});