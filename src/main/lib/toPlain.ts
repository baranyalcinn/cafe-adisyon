/**
 * Prisma'nın $extends wrapper tiplerinden kurtulmak için tipi sadece cast eder.
 * Gerçek serileştirme işlemini Electron'un IPC katmanına (Structured Clone) bırakır.
 * Bu yöntem JSON.stringify'dan çok daha hızlıdır ve bellek sıçraması yapmaz.
 */
export function toPlain<T>(data: unknown): T {
  if (data === null || data === undefined) return data as T
  // Prisma proxy nesnelerini düzleştirir (Electron Structured Clone darboğazını çözer)
  return JSON.parse(JSON.stringify(data)) as T
}
