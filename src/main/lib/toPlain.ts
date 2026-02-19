/**
 * Strips Prisma's `$extends` client wrapper types by doing a
 * structured clone.  This is safe for SQLite data types
 * (no BigInt / Decimal), and lets us return clean shared-interface
 * objects without `as unknown as T` casts everywhere.
 *
 * Uses `structuredClone` instead of `JSON.parse(JSON.stringify)` for:
 * - Lower CPU usage (no string serialization)
 * - Lower RAM spikes (no intermediate string)
 * - Preserves Date objects
 */
export function toPlain<T>(data: unknown): T {
  return structuredClone(data) as T
}
