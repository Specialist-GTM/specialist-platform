import { type ZodType } from 'zod';

export interface ValidationErrorDetail {
  path: string;
  message: string;
  code: string;
}

export type ValidationResult<T> =
  | { success: true; data: T; errors?: never }
  | { success: false; errors: ValidationErrorDetail[]; data?: never };

export function validatePayload<T>(schema: ZodType<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: ValidationErrorDetail[] = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return { success: false, errors };
}