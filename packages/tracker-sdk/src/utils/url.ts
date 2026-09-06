export function parseUrl(href: string): URL | null {
  try {
    return new URL(href.trim());
  } catch {
    return null;
  }
}

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}