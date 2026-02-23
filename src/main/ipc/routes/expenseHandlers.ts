import { ipcMain } from 'electron'
import { expenseSchemas, validateInput } from '../../../shared/ipc-schemas'
import { IPC_CHANNELS } from '../../../shared/types'
import { expenseService } from '../../services/ExpenseService'

export function registerExpenseHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.EXPENSES_CREATE, async (_, data) => {
    const validation = validateInput(expenseSchemas.create, data)
    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    const result = await expenseService.createExpense(validation.data)
    return result
  })

  ipcMain.handle(IPC_CHANNELS.EXPENSES_GET_ALL, (_, options) =>
    expenseService.getAllExpenses(options)
  )

  ipcMain.handle(IPC_CHANNELS.EXPENSES_GET_STATS, (_, options) =>
    expenseService.getExpenseStats(options)
  )

  ipcMain.handle(IPC_CHANNELS.EXPENSES_UPDATE, async (_, id, data) => {
    const validation = validateInput(expenseSchemas.update, { id, data })
    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    const result = await expenseService.updateExpense(validation.data.id, validation.data.data)
    return result
  })

  ipcMain.handle(IPC_CHANNELS.EXPENSES_DELETE, async (_, id) => {
    // Validate?
    const validation = validateInput(expenseSchemas.delete, { id })
    if (!validation.success) {
      return { success: false, error: validation.error }
    }
    const result = await expenseService.deleteExpense(validation.data.id)
    return result
  })
}
