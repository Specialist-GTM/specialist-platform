import type { Tracker } from '../core/tracker.js';
import { detectContactClick } from '../detectors/click-detector.js';
import type { DetectedContact, DetectedContactClick } from '../detectors/click-detector.js';
import { ClickDeduplicator } from '../utils/deduplicator.js';

export const CLICK_DEDUPE_WINDOW_MS = 750;

const CONTACT_SELECTOR = 'a[href], button[data-href], [data-sgtm-click]';

const CONTACT_EVENT_BY_TYPE: Record<DetectedContactClick['type'], string> = {
  whatsapp: 'WhatsAppClick',
  tel: 'PhoneCallClick',
  mailto: 'EmailClick',
};

export class ClickListener {
  private readonly deduplicator = new ClickDeduplicator(CLICK_DEDUPE_WINDOW_MS);
  private readonly handleClick: (event: MouseEvent) => void;

  constructor(private readonly tracker: Tracker) {
    this.handleClick = (event: MouseEvent) => {
      this.handleDocumentClick(event);
    };
  }

  start(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.addEventListener('click', this.handleClick, true);
  }

  stop(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.removeEventListener('click', this.handleClick, true);
  }

  private handleDocumentClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const element = target.closest<HTMLElement>(CONTACT_SELECTOR);
    if (element === null) {
      return;
    }
    const contact = detectContactClick(element);
    if (contact === null) {
      return;
    }
    if (this.deduplicator.isDuplicate(contact.detected.url, element)) {
      return;
    }
    this.track(contact);
  }

  private track(contact: DetectedContact): void {
    const data = this.buildEventData(contact);
    this.tracker.track(CONTACT_EVENT_BY_TYPE[contact.detected.type], data);
    this.tracker.track('Contact', data);
  }

  private buildEventData(contact: DetectedContact): Record<string, unknown> {
    const { detected, elementText, elementId, elementClasses } = contact;
    const data: Record<string, unknown> = {
      contact_type: detected.type,
      url: detected.url,
      element_text: elementText,
    };
    if (elementId !== undefined) {
      data.element_id = elementId;
    }
    if (elementClasses !== undefined) {
      data.element_classes = elementClasses;
    }

    switch (detected.type) {
      case 'whatsapp':
        data.phone = detected.phone;
        data.clean_phone = detected.cleanPhone;
        if (detected.text !== undefined) {
          data.message = detected.text;
        }
        break;
      case 'tel':
        data.phone = detected.phone;
        data.clean_phone = detected.cleanPhone;
        break;
      case 'mailto':
        data.email = detected.email;
        if (detected.subject !== undefined) {
          data.subject = detected.subject;
        }
        if (detected.body !== undefined) {
          data.body = detected.body;
        }
        break;
    }
    return data;
  }
}