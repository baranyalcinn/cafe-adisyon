import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { adminService } from '../../services/AdminService'
import { adminSchemas, validateInput } from '../../../shared/ipc-schemas'

export function registerAdminHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.ADMIN_VERIFY_PIN, (_, pin) => {
    const validation = validateInput(adminSchemas.verifyPin, { pin })
    if (!validation.success) return { success: false, error: validation.error }
    return adminService.verifyPin(validation.data.pin)
  })

  ipcMain.handle(IPC_CHANNELS.ADMIN_CHECK_STATUS, () => adminService.checkStatus())

  ipcMain.handle(IPC_CHANNELS.ADMIN_CHANGE_PIN, (_, current, newPin) => {
    const validation = validateInput(adminSchemas.changePin, { currentPin: current, newPin })
    if (!validation.success) return { success: false, error: validation.error }
    return adminService.changePin(validation.data.currentPin, validation.data.newPin)
  })

  ipcMain.handle(IPC_CHANNELS.ADMIN_SET_RECOVERY, (_, current, q, a) => {
    const validation = validateInput(adminSchemas.setRecovery, {
      currentPin: current,
      question: q,
      answer: a
    })
    if (!validation.success) return { success: false, error: validation.error }
    return adminService.setRecovery(
      validation.data.currentPin,
      validation.data.question,
      validation.data.answer
    )
  })

  ipcMain.handle(IPC_CHANNELS.ADMIN_GET_RECOVERY_QUESTION, () => adminService.getRecoveryQuestion())

  ipcMain.handle(IPC_CHANNELS.ADMIN_RESET_PIN, (_, answer) => {
    const validation = validateInput(adminSchemas.resetPin, { answer })
    if (!validation.success) return { success: false, error: validation.error }
    return adminService.resetPin(validation.data.answer)
  })
}
