import { ipcMain } from 'electron'
import { expenseSchemas } from '../../../shared/ipc-schemas'
import { IPC_CHANNELS } from '../../../shared/types'
import { expenseService } from '../../services/ExpenseService'
import { createValidatedHandler } from '../utils/ipcWrapper'

export function registerExpenseHandlers(): void {
  // CREATE
  createValidatedHandler(
    IPC_CHANNELS.EXPENSES_CREATE,
    expenseSchemas.create,
    (data) => expenseService.createExpense(data),
    'Gider eklenirken hata oluştu'
  )

  // GET ALL - no validation schema, simple passthrough
  ipcMain.handle(IPC_CHANNELS.EXPENSES_GET_ALL, (_, options) =>
    expenseService.getAllExpenses(options)
  )

  // GET STATS - no validation schema, simple passthrough
  ipcMain.handle(IPC_CHANNELS.EXPENSES_GET_STATS, (_, options) =>
    expenseService.getExpenseStats(options)
  )

  // UPDATE
  createValidatedHandler(
    IPC_CHANNELS.EXPENSES_UPDATE,
    expenseSchemas.update,
    (data) => expenseService.updateExpense(data.id, data.data),
    'Gider güncellenirken hata oluştu'
  )

  // DELETE
  createValidatedHandler(
    IPC_CHANNELS.EXPENSES_DELETE,
    expenseSchemas.delete,
    (data) => expenseService.deleteExpense(data.id),
    'Gider silinirken hata oluştu'
  )
}
