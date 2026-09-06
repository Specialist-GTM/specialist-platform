import { describe, expect, it } from 'vitest';

import { checkThankYouPage, THANK_YOU_PATTERNS } from '../index.js';

describe('checkThankYouPage', () => {
  it('detects common thank you paths', () => {
    expect(checkThankYouPage('https://exemplo.com/obrigado')).toEqual({ isThankYou: true, pattern: 'obrigado' });
    expect(checkThankYouPage('https://exemplo.com/obrigada')).toEqual({ isThankYou: true, pattern: 'obrigado' });
    expect(checkThankYouPage('https://exemplo.com/thank-you')).toEqual({ isThankYou: true, pattern: 'thank-you' });
    expect(checkThankYouPage('https://exemplo.com/thanks')).toEqual({ isThankYou: true, pattern: 'thanks' });
    expect(checkThankYouPage('https://exemplo.com/sucesso')).toEqual({ isThankYou: true, pattern: 'sucesso' });
    expect(checkThankYouPage('https://exemplo.com/conversao')).toEqual({ isThankYou: true, pattern: 'conversao' });
    expect(checkThankYouPage('https://exemplo.com/confirmacao')).toEqual({ isThankYou: true, pattern: 'confirmacao' });
    expect(checkThankYouPage('https://exemplo.com/agradecimento')).toEqual({ isThankYou: true, pattern: 'agradecimento' });
  });

  it('detects success query parameters', () => {
    expect(checkThankYouPage('https://exemplo.com/?status=success')).toEqual({
      isThankYou: true,
      pattern: 'query-param',
    });
    expect(checkThankYouPage('https://exemplo.com/lead?submitted=1')).toEqual({
      isThankYou: true,
      pattern: 'query-param',
    });
  });

  it('ignores regular pages', () => {
    expect(checkThankYouPage('https://exemplo.com/contato')).toEqual({ isThankYou: false });
    expect(checkThankYouPage('https://exemplo.com/home')).toEqual({ isThankYou: false });
  });

  it('exposes non-empty patterns', () => {
    expect(THANK_YOU_PATTERNS.length).toBeGreaterThan(0);
  });
});