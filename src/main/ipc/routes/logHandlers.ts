import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { logService } from '../../services/LogService'
import { createSimpleHandler } from '../utils/ipcWrapper'

export function registerLogHandlers(): void {
  // GET RECENT - args packed in preload
  ipcMain.handle(
    IPC_CHANNELS.LOGS_GET_RECENT,
    (
      _,
      args: {
        limit: number
        startDate?: string
        endDate?: string
        offset: number
        search?: string
        category?: string
      }
    ) => {
      return logService.getRecentLogs(
        args.limit,
        args.startDate,
        args.endDate,
        args.offset,
        args.search,
        args.category as 'all' | 'system' | 'operation' | undefined
      )
    }
  )

  // CREATE - args packed in preload
  ipcMain.handle(
    IPC_CHANNELS.LOGS_CREATE,
    (_, args: { action: string; tableName?: string; userName?: string; details?: string }) =>
      logService.createLog(args.action, args.tableName, args.details, args.userName)
  )

  createSimpleHandler(
    IPC_CHANNELS.LOGS_GET_STATS_TODAY,
    () => logService.getStatsToday(),
    'Günlük istatistikler alınırken hata oluştu'
  )
}
