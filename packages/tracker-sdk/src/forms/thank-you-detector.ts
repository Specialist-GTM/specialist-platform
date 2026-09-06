export interface ThankYouDetection {
  isThankYou: boolean;
  pattern?: string;
}

export const THANK_YOU_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /\/obrigad[oa]/i, label: 'obrigado' },
  { pattern: /\/thank-?you/i, label: 'thank-you' },
  { pattern: /\/thanks/i, label: 'thanks' },
  { pattern: /\/sucesso/i, label: 'sucesso' },
  { pattern: /\/conversao/i, label: 'conversao' },
  { pattern: /\/confirmacao/i, label: 'confirmacao' },
  { pattern: /\/agradecimento/i, label: 'agradecimento' },
  { pattern: /[?&](status|submitted|success)=/i, label: 'query-param' },
];

export function checkThankYouPage(url: string): ThankYouDetection {
  for (const entry of THANK_YOU_PATTERNS) {
    if (entry.pattern.test(url)) {
      return { isThankYou: true, pattern: entry.label };
    }
  }
  return { isThankYou: false };
}