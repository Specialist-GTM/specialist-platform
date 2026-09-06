import { sha256Hex } from '@specialist-gtm/crypto-utils';

export interface HashedUserData {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  email_hash?: string;
  phone_number_hash?: string;
}

export interface PiiInput {
  email?: string;
  phone?: string;
  name?: string;
}

export async function hashPii(input: PiiInput): Promise<HashedUserData> {
  const result: HashedUserData = {};

  if (input.email !== undefined) {
    const normalized = normalizeEmail(input.email);
    if (normalized.length > 0) {
      const hash = await sha256Hex(normalized);
      result.em = hash;
      result.email_hash = hash;
    }
  }

  if (input.phone !== undefined) {
    const normalized = normalizePhone(input.phone);
    if (normalized.length > 0) {
      const hash = await sha256Hex(normalized);
      result.ph = hash;
      result.phone_number_hash = hash;
    }
  }

  if (input.name !== undefined) {
    const { first, last } = splitName(input.name);
    if (first.length > 0) {
      result.fn = await sha256Hex(normalizeNamePart(first));
    }
    if (last.length > 0) {
      result.ln = await sha256Hex(normalizeNamePart(last));
    }
  }

  return result;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits;
  }
  return digits;
}

function normalizeNamePart(part: string): string {
  return part
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  return {
    first: parts[0] ?? '',
    last: parts.slice(1).join(' '),
  };
}