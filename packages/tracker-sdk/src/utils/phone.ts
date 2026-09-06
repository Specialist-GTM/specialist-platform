export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}