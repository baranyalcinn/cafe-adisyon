import { Prisma } from '../../generated/prisma/client'
import { ActivityLog, ApiResponse } from '../../shared/types'
import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { toPlain } from '../lib/toPlain'

export class LogService {
  private logQueue: Prisma.ActivityLogCreateManyInput[] = []
  private flushTimeout: NodeJS.Timeout | null = null

  async getRecentLogs(
    limit: number = 100,
    startDate?: string,
    endDate?: string,
    offset: number = 0,
    search?: string,
    category?: 'all' | 'system' | 'operation'
  ): Promise<ApiResponse<ActivityLog[]>> {
    const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 100))
    const safeOffset = Math.max(0, Number(offset) || 0)

    try {
      const where: Prisma.ActivityLogWhereInput = {}

      // Date filtering
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }

      // Search filtering
      if (search) {
        where.OR = [
          { details: { contains: search } },
          { tableName: { contains: search } },
          { action: { contains: search } },
          { userName: { contains: search } }
        ]
      }

      // Category filtering
      if (category && category !== 'all') {
        const systemActions = [
          'GENERATE_ZREPORT',
          'BACKUP_DATABASE',
          'ARCHIVE_DATA',
          'END_OF_DAY',
          'VACUUM',
          'SOFT_RESET'
        ]

        if (category === 'system') {
          where.action = { in: systemActions }
        } else {
          where.action = { notIn: systemActions }
        }
      }

      const logs = await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip: safeOffset
      })

      return { success: true, data: toPlain<ActivityLog[]>(logs) }
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
    const logEntry = { action, tableName, details, userName, createdAt: new Date() }
    this.logQueue.push(logEntry)

    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flushLogs(), 1000)
    }

    return { success: true, data: logEntry as ActivityLog }
  }

  private async flushLogs(): Promise<void> {
    this.flushTimeout = null
    if (this.logQueue.length === 0) return

    const logsToCreate = [...this.logQueue]
    this.logQueue = []

    try {
      await prisma.activityLog.createMany({
        data: logsToCreate
      })
    } catch (error) {
      logger.error('LogService.flushLogs', error)
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
