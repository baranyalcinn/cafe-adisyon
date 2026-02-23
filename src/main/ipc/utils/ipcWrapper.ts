import { ipcMain } from 'electron'
import { z } from 'zod'
import type { ApiResponse } from '../../../shared/types'
import { logger } from '../../lib/logger'
import { toPlain } from '../../lib/toPlain'

// ──────────────────────────────────────────────
//  Validated Handler — service ALREADY returns ApiResponse<T>
//  (most services: OrderService, ProductService, etc.)
// ──────────────────────────────────────────────

/**
 * Creates a validated IPC handler for services that already return `ApiResponse<T>`.
 *
 * 1. Validates the incoming payload against a Zod schema
 * 2. Passes the typed result to the service handler
 * 3. Returns the service response directly (no re-wrapping)
 * 4. Catches unexpected exceptions and returns `{ success: false, error }`
 */
export const createValidatedHandler = <TInput, TOutput>(
  channel: string,
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput) => Promise<ApiResponse<TOutput>>,
  errorMessage: string
): void => {
  ipcMain.handle(channel, async (_, payload: unknown): Promise<ApiResponse<TOutput>> => {
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      const validationError = parsed.error.issues.map((i) => i.message).join(', ')
      logger.error(channel, new Error(`Validation: ${validationError}`))
      return { success: false, error: validationError }
    }

    try {
      const result = await handler(parsed.data)
      if (result.success && result.data !== undefined) {
        return { ...result, data: toPlain(result.data) }
      }
      return result
    } catch (err) {
      logger.error(channel, err instanceof Error ? err : new Error(String(err)))
      return { success: false, error: err instanceof Error ? err.message : errorMessage }
    }
  })
}

// ──────────────────────────────────────────────
//  Simple Handler — no payload, service returns ApiResponse<T>
// ──────────────────────────────────────────────

/**
 * Creates a no-arg IPC handler for services that already return `ApiResponse<T>`.
 */
export const createSimpleHandler = <TOutput>(
  channel: string,
  handler: () => Promise<ApiResponse<TOutput>>,
  errorMessage: string
): void => {
  ipcMain.handle(channel, async (): Promise<ApiResponse<TOutput>> => {
    try {
      const result = await handler()
      if (result.success && result.data !== undefined) {
        return { ...result, data: toPlain(result.data) }
      }
      return result
    } catch (err) {
      logger.error(channel, err instanceof Error ? err : new Error(String(err)))
      return { success: false, error: err instanceof Error ? err.message : errorMessage }
    }
  })
}

// ──────────────────────────────────────────────
//  Raw Handler — service returns raw data,
//  wrapper wraps it as { success: true, data }
//  (for inline Prisma calls, etc.)
// ──────────────────────────────────────────────

/**
 * Creates a validated IPC handler for functions that return RAW data.
 * The wrapper itself wraps the result as `{ success: true, data }`.
 */
export const createRawHandler = <TInput, TOutput>(
  channel: string,
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput) => Promise<TOutput>,
  errorMessage: string
): void => {
  ipcMain.handle(channel, async (_, payload: unknown): Promise<ApiResponse<TOutput>> => {
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      const validationError = parsed.error.issues.map((i) => i.message).join(', ')
      logger.error(channel, new Error(`Validation: ${validationError}`))
      return { success: false, error: validationError }
    }

    try {
      const data = await handler(parsed.data)
      return { success: true, data: data !== undefined ? toPlain(data) : data }
    } catch (err) {
      logger.error(channel, err instanceof Error ? err : new Error(String(err)))
      return { success: false, error: err instanceof Error ? err.message : errorMessage }
    }
  })
}

/**
 * Creates a no-arg IPC handler for functions that return RAW data.
 */
export const createSimpleRawHandler = <TOutput>(
  channel: string,
  handler: () => Promise<TOutput>,
  errorMessage: string
): void => {
  ipcMain.handle(channel, async (): Promise<ApiResponse<TOutput>> => {
    try {
      const data = await handler()
      return { success: true, data: data !== undefined ? toPlain(data) : data }
    } catch (err) {
      logger.error(channel, err instanceof Error ? err : new Error(String(err)))
      return { success: false, error: err instanceof Error ? err.message : errorMessage }
    }
  })
}
