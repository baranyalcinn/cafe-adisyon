/**
 * Strips Prisma's `$extends` client wrapper types by doing a
 * serialization round-trip.  This is safe for SQLite data types
 * (no BigInt / Decimal), and lets us return clean shared-interface
 * objects without `as unknown as T` casts everywhere.
 */
export function toPlain<T>(data: unknown): T {
  return JSON.parse(JSON.stringify(data)) as T
}
