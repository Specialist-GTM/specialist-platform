import { sanitizePhone } from '../utils/phone.js';
import { parseUrl, safeDecode } from '../utils/url.js';

export interface WhatsAppDetails {
  type: 'whatsapp';
  phone: string;
  cleanPhone: string;
  text?: string;
  url: string;
}

const WHATSAPP_SEND_DOMAINS = new Set(['api.whatsapp.com', 'web.whatsapp.com']);
const WA_ME_SUFFIX = /(^|\.)wa\.me$/;

export function parseWhatsAppUrl(href: string): WhatsAppDetails | null {
  const url = parseUrl(href);
  if (url === null) {
    return null;
  }

  const host = url.hostname;
  let rawPhone: string | null = null;
  let text: string | null = null;

  if (url.protocol === 'whatsapp:' && host === 'send') {
    rawPhone = url.searchParams.get('phone');
    text = url.searchParams.get('text') ?? url.searchParams.get('message');
  } else if (WA_ME_SUFFIX.test(host)) {
    const segment = url.pathname.split('/').filter(Boolean)[0] ?? '';
    rawPhone = safeDecode(segment);
    text = url.searchParams.get('text');
  } else if (WHATSAPP_SEND_DOMAINS.has(host) && url.pathname.startsWith('/send')) {
    rawPhone = url.searchParams.get('phone');
    text = url.searchParams.get('text') ?? url.searchParams.get('message');
  } else {
    return null;
  }

  if (rawPhone === null || rawPhone.length === 0) {
    return null;
  }

  const cleanPhone = sanitizePhone(rawPhone);
  if (cleanPhone.length === 0) {
    return null;
  }

  return {
    type: 'whatsapp',
    phone: rawPhone,
    cleanPhone,
    text: text !== null && text.length > 0 ? text : undefined,
    url: href,
  };
}