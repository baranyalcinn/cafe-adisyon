/**
 * Formats a given amount in cents into a Turkish Lira (TRY) currency string.
 * This is used across both Main and Renderer processes to ensure consistent pricing display.
 *
 * @param amountInCents The amount to format, in cents (e.g., 100 for 1.00 TL).
 * @returns A formatted string (e.g., "1.234 ₺").
 */
export function formatCurrency(amountInCents: number): string {
  const formatted = formatLira(amountInCents)
  return `${formatted} ₺`
}

/**
 * Formats a given amount in cents into a Turkish Lira (TRY) decimal string without symbol.
 * Example: 12345 cents -> "123,45" or "123" depending on options.
 */
export function formatLira(amountInCents: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amountInCents / 100)
}

/**
 * Converts cents to a numeric Lira value.
 */
export const toLira = (cents: number): number => cents / 100

/**
 * Converts a Lira value (or string) back to cents.
 */
export const toCents = (lira: number | string): number => {
  const val = typeof lira === 'string' ? parseFloat(lira) : lira
  return Math.round(val * 100)
}
