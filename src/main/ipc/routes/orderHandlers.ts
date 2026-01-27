import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { orderService } from '../../services/OrderService'

export function registerOrderHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.ORDERS_GET_OPEN_BY_TABLE, async (_, tableId) =>
    orderService.getOpenOrderForTable(tableId)
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_CREATE, async (_, tableId) =>
    orderService.createOrder(tableId)
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_ADD_ITEM, async (_, orderId, productId, quantity, unitPrice) =>
    orderService.addItem(orderId, productId, quantity, unitPrice)
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_UPDATE_ITEM, async (_, orderItemId, quantity) =>
    orderService.updateItem(orderItemId, quantity)
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_REMOVE_ITEM, async (_, orderItemId) =>
    orderService.removeItem(orderItemId)
  )

  ipcMain.handle(IPC_CHANNELS.PAYMENTS_CREATE, async (_, orderId, amount, method) =>
    orderService.processPayment(orderId, amount, method)
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_MARK_ITEMS_PAID, async (_, items) =>
    orderService.markItemsPaid(items)
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_DELETE, async (_, orderId) =>
    orderService.deleteOrder(orderId)
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_UPDATE, async (_, orderId, data) =>
    orderService.updateOrder(orderId, data)
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_TOGGLE_LOCK, async (_, orderId, isLocked) =>
    orderService.toggleLock(orderId, isLocked)
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_GET_HISTORY, (_, options) =>
    orderService.getOrderHistory(options)
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_TRANSFER, async (_, orderId, targetTableId) =>
    orderService.transferTable(orderId, targetTableId)
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_MERGE, async (_, sourceOrderId, targetOrderId) =>
    orderService.mergeTables(sourceOrderId, targetOrderId)
  )
}
