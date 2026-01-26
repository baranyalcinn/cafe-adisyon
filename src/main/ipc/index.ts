import { registerOrderHandlers } from './routes/orderHandlers'
import { registerProductHandlers } from './routes/productHandlers'
import { registerReportingHandlers } from './routes/reportingHandlers'
import { registerAdminHandlers } from './routes/adminHandlers'
import { registerExpenseHandlers } from './routes/expenseHandlers'
import { registerMaintenanceHandlers } from './routes/maintenanceHandlers'
import { registerTableHandlers } from './routes/tableHandlers'
import { registerCategoryHandlers } from './routes/categoryHandlers'
import { registerLogHandlers } from './routes/logHandlers'

export function registerAllHandlers(): void {
  registerTableHandlers()
  registerCategoryHandlers()
  registerOrderHandlers()
  registerProductHandlers()
  registerReportingHandlers()
  registerAdminHandlers()
  registerExpenseHandlers()
  registerMaintenanceHandlers()
  registerLogHandlers()
}
