import { ipcMain } from 'electron'
import { z } from 'zod'
import type { ApiResponse } from '../../../shared/types'
import { logger } from '../../lib/logger'
import { toPlain } from '../../lib/toPlain'

// ============================================================================
// Core Utility Helpers (DRY)
// ============================================================================

/**
 * Ortak Hata Yakalayıcı ve Çalıştırıcı (Centralized Execution & Error Handling)
 * Tüm handler'ların try-catch, toPlain dönüşümü ve loglama işlemlerini tek merkezden yönetir.
 */
const safeExecute = async <T>(
  channel: string,
  errorMessage: string,
  action: () => Promise<ApiResponse<T>>
): Promise<ApiResponse<T>> => {
  try {
    const result = await action()
    if (result.success && result.data !== undefined) {
      return { ...result, data: toPlain(result.data) }
    }
    return result
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error(channel, error)
    return { success: false, error: error.message || errorMessage }
  }
}

/**
 * Ortak Zod Validasyon Aracı
 * ipc-schema.ts'deki yapıya uygun olarak nokta atışı (path-based) hatalar üretir.
 */
const validatePayload = <T>(
  channel: string,
  schema: z.ZodSchema<T>,
  payload: unknown
): { success: true; data: T } | { success: false; error: string } => {
  const parsed = schema.safeParse(payload)

  if (!parsed.success) {
    const validationError = parsed.error.issues
      .map((issue) => {
        const fieldPath = issue.path.join('.')
        return fieldPath ? `[${fieldPath}]: ${issue.message}` : issue.message
      })
      .join(' | ')

    logger.error(channel, new Error(`Validation: ${validationError}`))
    return { success: false, error: validationError }
  }

  return { success: true, data: parsed.data }
}

// ============================================================================
// 1. Validated Handler (Service returns ApiResponse<T>)
// ============================================================================

export const createValidatedHandler = <TInput, TOutput>(
  channel: string,
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput) => Promise<ApiResponse<TOutput>>,
  errorMessage: string
): void => {
  ipcMain.handle(channel, async (_, payload: unknown): Promise<ApiResponse<TOutput>> => {
    const validation = validatePayload(channel, schema, payload)
    if (!validation.success) return { success: false, error: validation.error }

    return safeExecute(channel, errorMessage, () => handler(validation.data))
  })
}

// ============================================================================
// 2. Simple Handler (No payload, Service returns ApiResponse<T>)
// ============================================================================

export const createSimpleHandler = <TOutput>(
  channel: string,
  handler: () => Promise<ApiResponse<TOutput>>,
  errorMessage: string
): void => {
  ipcMain.handle(channel, () => safeExecute(channel, errorMessage, handler))
}

// ============================================================================
// 3. Raw Handler (Service returns raw data, wrapper adds { success: true })
// ============================================================================

export const createRawHandler = <TInput, TOutput>(
  channel: string,
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput) => Promise<TOutput>,
  errorMessage: string
): void => {
  ipcMain.handle(channel, async (_, payload: unknown): Promise<ApiResponse<TOutput>> => {
    const validation = validatePayload(channel, schema, payload)
    if (!validation.success) return { success: false, error: validation.error }

    return safeExecute(channel, errorMessage, async () => {
      const data = await handler(validation.data)
      return { success: true, data }
    })
  })
}

// ============================================================================
// 4. Simple Raw Handler (No payload, wrapper adds { success: true })
// ============================================================================

export const createSimpleRawHandler = <TOutput>(
  channel: string,
  handler: () => Promise<TOutput>,
  errorMessage: string
): void => {
  ipcMain.handle(channel, () =>
    safeExecute(channel, errorMessage, async () => {
      const data = await handler()
      return { success: true, data }
    })
  )
}
