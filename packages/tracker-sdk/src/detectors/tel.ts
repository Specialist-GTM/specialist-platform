import { sanitizePhone } from '../utils/phone.js';

export interface TelDetails {
  type: 'tel';
  phone: string;
  cleanPhone: string;
  url: string;
}

export function parseTelUrl(href: string): TelDetails | null {
  if (!href.toLowerCase().startsWith('tel:')) {
    return null;
  }
  const phone = href.slice(4).trim();
  const cleanPhone = sanitizePhone(phone);
  if (cleanPhone.length === 0) {
    return null;
  }
  return { type: 'tel', phone, cleanPhone, url: href };
}