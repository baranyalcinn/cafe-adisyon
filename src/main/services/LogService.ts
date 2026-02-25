import { getBusinessDayStart, getBusinessShiftEnd } from '@shared/utils/date'
import { Prisma } from '../../generated/prisma/client'
import { ActivityLog, ApiResponse } from '../../shared/types'
import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'
import { toPlain } from '../lib/toPlain'

const SYSTEM_ACTIONS = [
  'GENERATE_ZREPORT',
  'ARCHIVE_DATA',
  'BACKUP_DATABASE',
  'END_OF_DAY',
  'VACUUM',
  'SOFT_RESET',
  'SECURITY_RESCUE',
  'SECURITY_CHANGE_PIN'
] as const

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
      if (category === 'system') {
        where.action = { in: [...SYSTEM_ACTIONS] }
      } else if (category === 'operation') {
        where.action = { notIn: [...SYSTEM_ACTIONS] }
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

  async getStatsToday(): Promise<ApiResponse<{ total: number; sys: number; ops: number }>> {
    try {
      const now = new Date()
      const start = getBusinessDayStart(now)
      const end = getBusinessShiftEnd(now)

      const [total, sys] = await Promise.all([
        prisma.activityLog.count({
          where: {
            createdAt: { gte: start, lte: end }
          }
        }),
        prisma.activityLog.count({
          where: {
            createdAt: { gte: start, lte: end },
            action: { in: [...SYSTEM_ACTIONS] }
          }
        })
      ])

      return {
        success: true,
        data: {
          total,
          sys,
          ops: Math.max(0, total - sys)
        }
      }
    } catch (error) {
      logger.error('LogService.getStatsToday', error)
      return { success: false, error: 'Günlük istatistikler alınamadı.' }
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
