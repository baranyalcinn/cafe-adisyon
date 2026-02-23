import { adminSchemas } from '../../../shared/ipc-schemas'
import { IPC_CHANNELS } from '../../../shared/types'
import { adminService } from '../../services/AdminService'
import { createSimpleHandler, createValidatedHandler } from '../utils/ipcWrapper'

export function registerAdminHandlers(): void {
  // VERIFY PIN
  createValidatedHandler(
    IPC_CHANNELS.ADMIN_VERIFY_PIN,
    adminSchemas.verifyPin,
    (data) => adminService.verifyPin(data.pin),
    'PIN doğrulanırken hata oluştu'
  )

  // CHECK STATUS
  createSimpleHandler(
    IPC_CHANNELS.ADMIN_CHECK_STATUS,
    () => adminService.checkStatus(),
    'Admin durumu kontrol edilirken hata oluştu'
  )

  // CHANGE PIN
  createValidatedHandler(
    IPC_CHANNELS.ADMIN_CHANGE_PIN,
    adminSchemas.changePin,
    (data) => adminService.changePin(data.currentPin, data.newPin),
    'PIN değiştirilirken hata oluştu'
  )

  // SET RECOVERY
  createValidatedHandler(
    IPC_CHANNELS.ADMIN_SET_RECOVERY,
    adminSchemas.setRecovery,
    (data) => adminService.setRecovery(data.currentPin, data.question, data.answer),
    'Kurtarma bilgileri ayarlanırken hata oluştu'
  )

  // GET RECOVERY QUESTION
  createSimpleHandler(
    IPC_CHANNELS.ADMIN_GET_RECOVERY_QUESTION,
    () => adminService.getRecoveryQuestion(),
    'Kurtarma sorusu getirilirken hata oluştu'
  )

  // RESET PIN
  createValidatedHandler(
    IPC_CHANNELS.ADMIN_RESET_PIN,
    adminSchemas.resetPin,
    (data) => adminService.resetPin(data.answer),
    'PIN sıfırlanırken hata oluştu'
  )
}
