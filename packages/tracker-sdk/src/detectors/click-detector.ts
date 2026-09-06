import { parseMailtoUrl } from './mailto.js';
import type { MailtoDetails } from './mailto.js';
import { parseTelUrl } from './tel.js';
import type { TelDetails } from './tel.js';
import { parseWhatsAppUrl } from './whatsapp.js';
import type { WhatsAppDetails } from './whatsapp.js';

export type DetectedContactClick = WhatsAppDetails | TelDetails | MailtoDetails;

export interface DetectedContact {
  detected: DetectedContactClick;
  elementText: string;
  elementId?: string;
  elementClasses?: string;
}

export function detectContactClick(element: Element): DetectedContact | null {
  const href =
    element.getAttribute('href') ?? element.getAttribute('data-href') ?? element.getAttribute('data-sgtm-click');
  if (href === null) {
    return null;
  }
  return detectContactFromHref(href, element);
}

export function detectContactFromHref(href: string, element: Element): DetectedContact | null {
  const detected = parseWhatsAppUrl(href) ?? parseTelUrl(href) ?? parseMailtoUrl(href);
  if (detected === null) {
    return null;
  }

  const classes = Array.from(element.classList).join(' ').trim();
  return {
    detected,
    elementText: (element.textContent ?? '').trim().replace(/\s+/g, ' '),
    elementId: element.id || undefined,
    elementClasses: classes.length > 0 ? classes : undefined,
  };
}