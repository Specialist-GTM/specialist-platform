export const EMPTY_FIELDS_FINGERPRINT = '__empty__';

export class FormDeduplicator {
  private readonly windowMs: number;
  private lastFingerprint: string | null = null;
  private lastAt = 0;

  constructor(windowMs = 2000) {
    this.windowMs = windowMs;
  }

  fingerprintFor(fields: Record<string, string>): string {
    if (Object.keys(fields).length === 0) {
      return EMPTY_FIELDS_FINGERPRINT;
    }
    return Object.entries(fields)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  isDuplicate(fingerprint: string): boolean {
    const now = Date.now();
    const elapsed = now - this.lastAt;
    if (this.lastFingerprint === null || elapsed >= this.windowMs) {
      this.lastFingerprint = fingerprint;
      this.lastAt = now;
      return false;
    }

    if (fingerprint === EMPTY_FIELDS_FINGERPRINT) {
      return true;
    }
    if (fingerprint === this.lastFingerprint) {
      return true;
    }
    this.lastFingerprint = fingerprint;
    this.lastAt = now;
    return false;
  }

  reset(): void {
    this.lastFingerprint = null;
    this.lastAt = 0;
  }
}