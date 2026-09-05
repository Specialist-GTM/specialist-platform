export interface CookieOptions {
  days?: number;
  seconds?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}

const DEFAULT_DAYS = 90;
const DEFAULT_PATH = '/';
const DEFAULT_SAME_SITE: NonNullable<CookieOptions['sameSite']> = 'Lax';
const PAST_EXPIRES = 'Thu, 01 Jan 1970 00:00:00 GMT';

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const pieces = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? DEFAULT_PATH}`,
    `SameSite=${options.sameSite ?? DEFAULT_SAME_SITE}`,
  ];
  if (options.secure ?? true) {
    pieces.push('Secure');
  }
  const expires = cookieExpires(options);
  if (expires !== null) {
    pieces.push(`Expires=${expires.toUTCString()}`);
  }
  return pieces.join('; ');
}

function cookieExpires(options: CookieOptions): Date | null {
  if (options.seconds !== undefined) {
    return new Date(Date.now() + options.seconds * 1000);
  }
  const days = options.days ?? DEFAULT_DAYS;
  if (days <= 0) {
    return null;
  }
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function isSecureContext(): boolean {
  return (
    typeof location !== 'undefined' &&
    typeof location.protocol === 'string' &&
    location.protocol === 'https:'
  );
}

export class CookieStorage {
  private readonly lsPrefix: string;

  constructor(lsPrefix = 'sgtm:') {
    this.lsPrefix = lsPrefix;
  }

  get(name: string): string | null {
    return this.readCookie(name) ?? this.readLocal(name);
  }

  set(name: string, value: string, options: CookieOptions = {}): void {
    if (!this.writeCookie(name, value, options)) {
      this.writeLocal(name, value);
    }
  }

  mirror(name: string, value: string, options: CookieOptions = {}): void {
    this.writeCookie(name, value, options);
    this.writeLocal(name, value);
  }

  remove(name: string): void {
    this.eraseCookie(name);
    this.removeLocal(name);
  }

  private readCookie(name: string): string | null {
    if (typeof document === 'undefined') {
      return null;
    }
    const prefix = `${name}=`;
    for (const part of document.cookie.split(';')) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        return decodeURIComponent(trimmed.slice(prefix.length));
      }
    }
    return null;
  }

  private writeCookie(name: string, value: string, options: CookieOptions): boolean {
    if (typeof document === 'undefined') {
      return false;
    }
    try {
      document.cookie = serializeCookie(name, value, {
        ...options,
        secure: options.secure ?? isSecureContext(),
      });
      return this.readCookie(name) !== null;
    } catch {
      return false;
    }
  }

  private eraseCookie(name: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    try {
      document.cookie = `${name}=; Path=${DEFAULT_PATH}; SameSite=${DEFAULT_SAME_SITE}; Expires=${PAST_EXPIRES}`;
    } catch {
      // ignore - localStorage mirror is cleared separately
    }
  }

  private readLocal(name: string): string | null {
    try {
      return this.storage().getItem(`${this.lsPrefix}${name}`);
    } catch {
      return null;
    }
  }

  private writeLocal(name: string, value: string): void {
    try {
      this.storage().setItem(`${this.lsPrefix}${name}`, value);
    } catch {
      // ignore - cookie write already happened or storage unavailable
    }
  }

  private removeLocal(name: string): void {
    try {
      this.storage().removeItem(`${this.lsPrefix}${name}`);
    } catch {
      // ignore
    }
  }

  private storage(): Storage {
    if (typeof window === 'undefined') {
      throw new Error('Storage unavailable');
    }
    return window.localStorage;
  }
}