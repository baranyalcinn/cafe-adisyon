import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { logService } from '../../services/LogService'

export function registerLogHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.LOGS_GET_RECENT, (_, limit) => logService.getRecentLogs(limit))

  ipcMain.handle(IPC_CHANNELS.LOGS_CREATE, (_, action, tableName, userName, details) =>
    logService.createLog(action, tableName, details, userName)
  )
}
