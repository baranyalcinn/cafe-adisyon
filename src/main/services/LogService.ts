import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { ApiResponse, ActivityLog } from '../../shared/types'

export class LogService {
  async getRecentLogs(limit: number = 100): Promise<ApiResponse<ActivityLog[]>> {
    try {
      const logs = (await prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
      })) as unknown as ActivityLog[]
      return { success: true, data: logs }
    } catch (error) {
      logger.error('LogService.getRecentLogs', error)
      return { success: false, error: 'İşlem geçmişi alınamadı.' }
    }
  }

  async createLog(
    action: string,
    tableName?: string,
    details?: string,
    userName?: string
  ): Promise<ApiResponse<ActivityLog>> {
    try {
      const log = (await prisma.activityLog.create({
        data: {
          action,
          tableName,
          details,
          userName
        }
      })) as unknown as ActivityLog
      return { success: true, data: log }
    } catch (error) {
      logger.error('LogService.createLog', error)
      return { success: false, error: 'Log kaydı oluşturulamadı.' }
    }
  }

  async clearLogs(keepAction?: string): Promise<ApiResponse<number>> {
    try {
      const result = await prisma.activityLog.deleteMany({
        where: keepAction ? { action: { not: keepAction } } : {}
      })
      return { success: true, data: result.count }
    } catch (error) {
      logger.error('LogService.clearLogs', error)
      return { success: false, error: 'Loglar temizlenemedi.' }
    }
  }
}

export const logService = new LogService()
