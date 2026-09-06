import { describe, expect, it } from 'vitest';

import {
  detectContactClick,
  detectContactFromHref,
  parseMailtoUrl,
  parseTelUrl,
  parseWhatsAppUrl,
  sanitizePhone,
} from '../index.js';

function anchor(href: string, html = ''): HTMLAnchorElement {
  const element = document.createElement('a');
  element.setAttribute('href', href);
  element.innerHTML = html;
  return element;
}

describe('sanitizePhone', () => {
  it('removes every non-digit character', () => {
    expect(sanitizePhone('+55 (11) 9999-9999')).toBe('551199999999');
    expect(sanitizePhone('5511999999999')).toBe('5511999999999');
    expect(sanitizePhone('abc')).toBe('');
  });
});

describe('parseWhatsAppUrl', () => {
  it('parses wa.me with a text parameter', () => {
    const parsed = parseWhatsAppUrl('https://wa.me/5511999999999?text=Ol%C3%A1%20gostaria%20de%20um%20or%C3%A7amento');
    expect(parsed).toEqual({
      type: 'whatsapp',
      phone: '5511999999999',
      cleanPhone: '5511999999999',
      text: 'Olá gostaria de um orçamento',
      url: 'https://wa.me/5511999999999?text=Ol%C3%A1%20gostaria%20de%20um%20or%C3%A7amento',
    });
  });

  it('parses api.whatsapp.com/send', () => {
    const parsed = parseWhatsAppUrl('https://api.whatsapp.com/send?phone=5521988887777');
    expect(parsed?.cleanPhone).toBe('5521988887777');
    expect(parsed?.text).toBeUndefined();
  });

  it('parses web.whatsapp.com/send with message text', () => {
    const parsed = parseWhatsAppUrl('https://web.whatsapp.com/send?phone=5531977776666&message=Oi');
    expect(parsed?.cleanPhone).toBe('5531977776666');
    expect(parsed?.text).toBe('Oi');
  });

  it('parses whatsapp://send', () => {
    const parsed = parseWhatsAppUrl('whatsapp://send?phone=5541966665555');
    expect(parsed?.cleanPhone).toBe('5541966665555');
  });

  it('sanitizes phone numbers with spaces and punctuation in the link', () => {
    const parsed = parseWhatsAppUrl('https://wa.me/+55 (11) 99999-9999');
    expect(parsed?.cleanPhone).toBe('5511999999999');
  });

  it('returns null for non-whatsapp links', () => {
    expect(parseWhatsAppUrl('https://example.com')).toBeNull();
    expect(parseWhatsAppUrl('tel:+5511999999999')).toBeNull();
    expect(parseWhatsAppUrl('not-a-url')).toBeNull();
  });
});

describe('parseTelUrl', () => {
  it('normalizes tel: links', () => {
    const parsed = parseTelUrl('tel:+5511999999999');
    expect(parsed).toEqual({
      type: 'tel',
      phone: '+5511999999999',
      cleanPhone: '5511999999999',
      url: 'tel:+5511999999999',
    });
  });

  it('handles formatting with spaces and punctuation', () => {
    const parsed = parseTelUrl('tel:(11) 9999-9999');
    expect(parsed?.cleanPhone).toBe('1199999999');
  });

  it('returns null when not a tel link', () => {
    expect(parseTelUrl('https://wa.me/5511')).toBeNull();
    expect(parseTelUrl('tel:')).toBeNull();
  });
});

describe('parseMailtoUrl', () => {
  it('extracts recipient, subject and body', () => {
    const parsed = parseMailtoUrl('mailto:comercial@empresa.com.br?subject=Duvida%20de%20produto&body=Ol%C3%A1');
    expect(parsed).toEqual({
      type: 'mailto',
      email: 'comercial@empresa.com.br',
      subject: 'Duvida de produto',
      body: 'Olá',
      url: 'mailto:comercial@empresa.com.br?subject=Duvida%20de%20produto&body=Ol%C3%A1',
    });
  });

  it('parses a plain mailto address', () => {
    const parsed = parseMailtoUrl('mailto:contato@empresa.com.br');
    expect(parsed?.email).toBe('contato@empresa.com.br');
    expect(parsed?.subject).toBeUndefined();
  });

  it('returns null when not a mailto link', () => {
    expect(parseMailtoUrl('https://wa.me/5511')).toBeNull();
  });
});

describe('detectContactClick', () => {
  it('detects whatsapp links with nested html', () => {
    const element = anchor('https://wa.me/5511999999999', '<span>Falar no Whats</span>');
    const contact = detectContactClick(element)!;
    expect(contact.detected.type).toBe('whatsapp');
    expect(contact.elementText).toBe('Falar no Whats');
  });

  it('collects element id and classes', () => {
    const element = anchor('tel:+5511999999999');
    element.id = 'call';
    element.className = 'cta phone';
    const contact = detectContactClick(element)!;
    expect(contact.elementId).toBe('call');
    expect(contact.elementClasses).toBe('cta phone');
  });

  it('detects mailto via an anchor element', () => {
    const element = anchor('mailto:contato@empresa.com.br');
    const contact = detectContactClick(element)!;
    expect(contact.detected.type).toBe('mailto');
  });

  it('reads data-href from buttons', () => {
    const button = document.createElement('button');
    button.setAttribute('data-href', 'https://wa.me/5511999999999');
    const contact = detectContactClick(button)!;
    expect(contact.detected.type).toBe('whatsapp');
  });

  it('ignores normal links', () => {
    const element = anchor('/politica-de-privacidade');
    expect(detectContactClick(element)).toBeNull();
  });

  it('returns null for elements without a contact target', () => {
    const element = document.createElement('div');
    expect(detectContactClick(element)).toBeNull();
  });
});

describe('detectContactFromHref', () => {
  it('detects a contact from a raw href and element', () => {
    const element = anchor('whatsapp://send?phone=5541966665555', '<strong>Chat</strong>');
    const contact = detectContactFromHref('whatsapp://send?phone=5541966665555', element)!;
    expect(contact.detected.type).toBe('whatsapp');
    expect(contact.elementText).toBe('Chat');
  });
});