import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { expenseService } from '../../services/ExpenseService'
import { reportingService } from '../../services/ReportingService'
import { expenseSchemas, validateInput } from '../../lib/validation' // Need validation logic

export function registerExpenseHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.EXPENSES_CREATE, async (_, data) => {
    // Validation Logic was in handlers.ts. We should keep it here or in Service?
    // Controller/Handler level validation is good.
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
