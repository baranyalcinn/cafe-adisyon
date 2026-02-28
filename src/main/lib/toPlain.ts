/**
 * Prisma Proxy zincirlerini Electron IPC'den önce düzleştirir.
 * Electron'un SCA'sı ile aynı algoritmayı kullanır: Date/Map/Set korunur,
 * prototype chain temizlenir. Harici bağımlılık gerektirmez.
 */
export function toPlain<T>(data: unknown): T {
  if (data === null || data === undefined) return data as T
  return structuredClone(data) as T
}
