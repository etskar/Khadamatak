/**
 * Maps server-side error codes to localized, user-friendly messages.
 * Client components pass the thrown Error message (which is a stable code
 * string produced by server actions) and a translator bound to the
 * `common.errors` namespace.
 */

export type ErrorTranslator = (key: string, opts?: { defaultValue?: string }) => string;

const KNOWN_CODES = new Set([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "FILE_TOO_LARGE",
  "INVALID_FILE_TYPE",
  "FILE_REQUIRED",
  "INVALID_INPUT",
  "VERIFICATION_REQUIRED",
  "GROUP_NOT_FOUND",
  "NOT_A_MEMBER",
  "TOKEN_INVALID",
  "WEAK_PASSWORD",
  "INVALID_PASSWORD",
  "NO_PASSWORD",
  "PASSWORD_MISMATCH",
  "EMAIL_TAKEN",
  "USERNAME_TAKEN",
  "INVALID_CREDENTIALS",
  "ACCOUNT_NOT_FOUND",
  "EMAIL_NOT_VERIFIED",
  "PHONE_NOT_VERIFIED",
  "TERMS_REQUIRED",
  "OTP_INVALID",
  "OTP_LOCKED",
  "ACTION_FAILED",
  "REGISTER_FAILED",
  "LOGIN_FAILED",
]);

/** Returns a friendly localized message for a thrown server error. */
export function getFriendlyError(error: unknown, t: ErrorTranslator): string {
  const code = error instanceof Error ? error.message : "ACTION_FAILED";
  if (KNOWN_CODES.has(code)) {
    return t(`errors.${code}`, { defaultValue: t("errors.generic") });
  }
  return t("errors.generic");
}

/** True when the thrown error carries a known, translatable code. */
export function isKnownError(error: unknown): boolean {
  return error instanceof Error && KNOWN_CODES.has(error.message);
}
