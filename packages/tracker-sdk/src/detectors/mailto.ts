export interface MailtoDetails {
  type: 'mailto';
  email: string;
  subject?: string;
  body?: string;
  url: string;
}

export function parseMailtoUrl(href: string): MailtoDetails | null {
  if (!href.toLowerCase().startsWith('mailto:')) {
    return null;
  }
  const rest = href.slice(7);
  const queryIndex = rest.indexOf('?');
  const addressPart = queryIndex >= 0 ? rest.slice(0, queryIndex) : rest;
  const email = addressPart.split(',')[0] ?? '';
  if (email.length === 0) {
    return null;
  }

  let subject: string | null = null;
  let body: string | null = null;
  if (queryIndex >= 0) {
    const params = new URLSearchParams(rest.slice(queryIndex + 1));
    subject = params.get('subject');
    body = params.get('body');
  }

  return {
    type: 'mailto',
    email: email.trim(),
    subject: subject ?? undefined,
    body: body ?? undefined,
    url: href,
  };
}