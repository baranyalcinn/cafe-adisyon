import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { adminService } from '../../services/AdminService'

export function registerAdminHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.ADMIN_VERIFY_PIN, (_, pin) => adminService.verifyPin(pin))

  ipcMain.handle(IPC_CHANNELS.ADMIN_CHECK_STATUS, () => adminService.checkStatus())

  ipcMain.handle(IPC_CHANNELS.ADMIN_CHANGE_PIN, (_, current, newPin) =>
    adminService.changePin(current, newPin)
  )

  ipcMain.handle(IPC_CHANNELS.ADMIN_SET_RECOVERY, (_, current, q, a) =>
    adminService.setRecovery(current, q, a)
  )

  ipcMain.handle(IPC_CHANNELS.ADMIN_GET_RECOVERY_QUESTION, () => adminService.getRecoveryQuestion())

  ipcMain.handle(IPC_CHANNELS.ADMIN_RESET_PIN, (_, answer) => adminService.resetPin(answer))
}
