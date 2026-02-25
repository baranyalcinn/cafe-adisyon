import type { ApiResponse } from '../../../shared/types'

/**
 * IPC'den dönen standart API yanıtını işler.
 * Hata varsa Promise'i reddeder (fırlatır), başarılıysa veriyi (data) döner.
 *
 * @param requestPromise IPC handler'ı tetikleyen Promise nesnesi (örn: api.orders.getAll())
 * @param customErrorMessage Özel bir hata mesajı dönülmek istenirse (Opsiyonel)
 * @returns Başarılı yanıttaki `data` verisi
 */
export async function resolveApi<T>(
  requestPromise: Promise<ApiResponse<T>>,
  customErrorMessage?: string
): Promise<T> {
  try {
    const result = await requestPromise
    if (!result.success) {
      throw new Error(result.error || customErrorMessage || 'Ağ işlem hatası: Yanıt anlaşılamadı.')
    }
    return result.data
  } catch (error: unknown) {
    // Merkezi bir Sentry loglama vb. buraya eklenebilir.
    console.error('[API Error]:', error)
    const err = error as Error
    throw new Error(
      err.message || customErrorMessage || 'İşlem sırasında bilinmeyen bir IPC hatası oluştu.'
    )
  }
}
