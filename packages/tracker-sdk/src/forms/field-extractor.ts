import { sanitizePhone } from '../utils/phone.js';

export type FormDetectionSource = 'submit' | 'fetch' | 'xhr' | 'mutation' | 'thank_you';

export interface ExtractedFormData {
  formId?: string;
  formName?: string;
  formAction?: string;
  fields: Record<string, string>;
  email?: string;
  phone?: string;
  name?: string;
}

export const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /passwd/i,
  /senha/i,
  /secret/i,
  /token/i,
  /card/i,
  /cvv/i,
  /cvc/i,
  /credit/i,
  /cartao/i,
  /expir/i,
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_KEY = /(^|[._-])e-?mail$/i;
const PHONE_KEY = /phone|telefone|cel|whats/i;
const PHONE_MIN_DIGITS = 8;
const NAME_KEY = /(^|[._-])(name|nome)([-_.]?completo)?$/i;

interface FormMeta {
  id?: string;
  name?: string;
  action?: string | null;
}

export function extractFormFields(
  formOrData: HTMLFormElement | FormData | Record<string, unknown>,
): ExtractedFormData {
  if (isFormData(formOrData)) {
    return finalize(collectFormData(formOrData), null);
  }
  if (isFormElement(formOrData)) {
    return finalize(collectFormElements(formOrData), formOrData);
  }
  return finalize(collectRecord(formOrData), null);
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function isFormElement(value: unknown): value is HTMLFormElement {
  return typeof HTMLFormElement !== 'undefined' && value instanceof HTMLFormElement;
}

function collectFormData(form: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [rawKey, rawValue] of form.entries()) {
    const key = rawKey.trim();
    if (key.length === 0 || isSensitive(key)) {
      continue;
    }
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (value.length === 0 || fields[key] !== undefined) {
      continue;
    }
    fields[key] = value;
  }
  return fields;
}

function collectRecord(source: Record<string, unknown>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(source)) {
    const key = rawKey.trim();
    if (key.length === 0 || isSensitive(key) || rawValue === null || rawValue === undefined) {
      continue;
    }
    const value = String(rawValue).trim();
    if (value.length === 0 || fields[key] !== undefined) {
      continue;
    }
    fields[key] = value;
  }
  return fields;
}

function collectFormElements(form: HTMLFormElement): Record<string, string> {
  const fields: Record<string, string> = {};
  const elements = form.elements;
  for (let i = 0; i < elements.length; i++) {
    const element = elements.item(i);
    if (element === null) {
      continue;
    }
    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLSelectElement) &&
      !(element instanceof HTMLTextAreaElement)
    ) {
      continue;
    }
    if (element.disabled) {
      continue;
    }

    const key = (element.name || element.id || '').trim();
    if (key.length === 0 || isSensitive(key)) {
      continue;
    }

    let value = '';
    if (element instanceof HTMLInputElement) {
      const type = (element.type || '').toLowerCase();
      if (type === 'password') {
        continue;
      }
      if (type === 'checkbox' || type === 'radio') {
        if (!element.checked) {
          continue;
        }
        value = element.value;
      } else if (type === 'submit' || type === 'button' || type === 'reset' || type === 'file' || type === 'image') {
        continue;
      } else {
        value = element.value;
      }
    } else if (element instanceof HTMLSelectElement) {
      value = element.value;
    } else {
      value = element.value;
    }

    value = value.trim();
    if (value.length === 0 || fields[key] !== undefined) {
      continue;
    }
    fields[key] = value;
  }
  return fields;
}

function finalize(fields: Record<string, string>, meta: FormMeta | null): ExtractedFormData {
  const result: ExtractedFormData = { fields };
  if (meta !== null) {
    if (meta.id !== undefined && meta.id.length > 0) {
      result.formId = meta.id;
    }
    if (meta.name !== undefined && meta.name.length > 0) {
      result.formName = meta.name;
    }
    if (meta.action !== undefined && meta.action !== null && meta.action.length > 0) {
      result.formAction = meta.action;
    }
  }

  const email = detectEmail(fields);
  const phone = detectPhone(fields);
  const name = detectName(fields);
  if (email !== undefined) {
    result.email = email;
  }
  if (phone !== undefined) {
    result.phone = phone;
  }
  if (name !== undefined) {
    result.name = name;
  }
  return result;
}

function isSensitive(key: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

function detectEmail(fields: Record<string, string>): string | undefined {
  for (const [key, value] of Object.entries(fields)) {
    if (EMAIL_KEY.test(key) && EMAIL_REGEX.test(value)) {
      return value;
    }
  }
  for (const value of Object.values(fields)) {
    if (EMAIL_REGEX.test(value)) {
      return value;
    }
  }
  return undefined;
}

function detectPhone(fields: Record<string, string>): string | undefined {
  for (const [key, value] of Object.entries(fields)) {
    if (PHONE_KEY.test(key)) {
      const clean = sanitizePhone(value);
      if (clean.length >= PHONE_MIN_DIGITS) {
        return clean;
      }
    }
  }
  return undefined;
}

function detectName(fields: Record<string, string>): string | undefined {
  for (const [key, value] of Object.entries(fields)) {
    if (NAME_KEY.test(key)) {
      return value.replace(/\s+/g, ' ');
    }
  }
  return undefined;
}