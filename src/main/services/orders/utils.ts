import { ApiResponse } from '../../../shared/types'
import { logger } from '../../lib/logger'

export function handleOrderError<T = null>(
  methodName: string,
  error: unknown,
  defaultMessage: string
): ApiResponse<T> {
  logger.error(`${methodName}`, error)

  if (
    error instanceof Error &&
    !error.message.includes('prisma') &&
    !error.message.includes('Database')
  ) {
    return { success: false, error: error.message }
  }
  return { success: false, error: defaultMessage }
}
