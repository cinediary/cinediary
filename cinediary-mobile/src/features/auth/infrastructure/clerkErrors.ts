import { isClerkAPIResponseError } from '@clerk/expo';

/** Extrai o código de erro do Clerk (ex.: form_password_incorrect). */
export function clerkErrorCode(error: unknown): string | undefined {
  if (isClerkAPIResponseError(error)) return error.errors[0]?.code;
  if (error && typeof error === 'object' && 'code' in error) return String(error.code);
  return undefined;
}
