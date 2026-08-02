/** All money is stored as integer cents. Never use floats for balances. */

export const DEFAULT_CURRENCY = "EUR" as const;

export function eurosToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid amount");
  }
  return Math.round(amount * 100);
}

export function centsToEuros(cents: number): number {
  return cents / 100;
}

export function formatMoney(
  cents: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = "nl-NL",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(centsToEuros(cents));
}

export function parseAmountToCents(input: string | number): number {
  if (typeof input === "number") return eurosToCents(input);
  const normalized = input.replace(",", ".").trim();
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("INVALID_AMOUNT");
  }
  return eurosToCents(value);
}
