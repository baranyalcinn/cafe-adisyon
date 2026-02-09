import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { expenseService } from '../../services/ExpenseService'
import { reportingService } from '../../services/ReportingService'
import { expenseSchemas, validateInput } from '../../../shared/ipc-schemas'

export function registerExpenseHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.EXPENSES_CREATE, async (_, data) => {
    const validation = validateInput(expenseSchemas.create, data)
    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    const result = await expenseService.createExpense(data)
    if (result.success) {
      // Trigger generic report update?
      await reportingService.updateMonthlyReport(new Date())
    }
    return result
  })

  ipcMain.handle(IPC_CHANNELS.EXPENSES_GET_ALL, () => expenseService.getAllExpenses())

  ipcMain.handle(IPC_CHANNELS.EXPENSES_UPDATE, async (_, id, data) => {
    // TODO: Add update validation schema to expenseSchemas
    // const validation = validateInput(expenseSchemas.update, data)
    // if (!validation.success) {
    //   return { success: false, error: validation.error }
    // }

    const result = await expenseService.updateExpense(id, data)
    if (result.success) {
      await reportingService.updateMonthlyReport(new Date())
    }
    return result
  })

  ipcMain.handle(IPC_CHANNELS.EXPENSES_DELETE, async (_, id) => {
    // Validate?
    const validation = validateInput(expenseSchemas.delete, { id })
    if (!validation.success) {
      return { success: false, error: validation.error }
    }
    const result = await expenseService.deleteExpense(id)
    if (result.success) {
      await reportingService.updateMonthlyReport(new Date())
    }
    return result
  })
}
