import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { orderService } from '../../services/OrderService'

import { orderSchemas, paymentSchemas, validateInput } from '../../../shared/ipc-schemas'

export function registerOrderHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.ORDERS_GET_OPEN_BY_TABLE, async (_, tableId) => {
    const validation = validateInput(orderSchemas.getByTable, { tableId })
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.getOpenOrderForTable(validation.data.tableId)
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_CREATE, async (_, tableId) => {
    const validation = validateInput(orderSchemas.create, { tableId })
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.createOrder(validation.data.tableId)
  })

  ipcMain.handle(
    IPC_CHANNELS.ORDERS_ADD_ITEM,
    async (_, orderId, productId, quantity, unitPrice) => {
      const validation = validateInput(orderSchemas.addItem, {
        orderId,
        productId,
        quantity,
        unitPrice
      })
      if (!validation.success) return { success: false, error: validation.error }
      return orderService.addItem(orderId, productId, quantity, unitPrice)
    }
  )

  ipcMain.handle(IPC_CHANNELS.ORDERS_UPDATE_ITEM, async (_, orderItemId, quantity) => {
    const validation = validateInput(orderSchemas.updateItem, { orderItemId, quantity })
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.updateItem(orderItemId, quantity)
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_REMOVE_ITEM, async (_, orderItemId) => {
    const validation = validateInput(orderSchemas.removeItem, { orderItemId })
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.removeItem(orderItemId)
  })

  ipcMain.handle(IPC_CHANNELS.PAYMENTS_CREATE, async (_, orderId, amount, paymentMethod) => {
    const validation = validateInput(paymentSchemas.create, { orderId, amount, paymentMethod })
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.processPayment(orderId, amount, paymentMethod)
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_MARK_ITEMS_PAID, async (_, items) => {
    const validation = validateInput(orderSchemas.markItemsPaid, items)
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.markItemsPaid(validation.data)
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_DELETE, async (_, orderId) => {
    const validation = validateInput(orderSchemas.delete, { orderId })
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.deleteOrder(validation.data.orderId)
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_UPDATE, async (_, orderId, data) => {
    const validation = validateInput(orderSchemas.update, { orderId, data })
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.updateOrder(validation.data.orderId, validation.data.data)
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_TOGGLE_LOCK, async (_, orderId, isLocked) => {
    const validation = validateInput(orderSchemas.toggleLock, { orderId, isLocked })
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.toggleLock(validation.data.orderId, validation.data.isLocked)
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_GET_HISTORY, (_, options) => {
    const validation = validateInput(orderSchemas.getHistory, options)
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.getOrderHistory(validation.data ?? {})
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_GET_DETAILS, async (_, orderId) => {
    if (!orderId || typeof orderId !== 'string') {
      return { success: false, error: 'Geçersiz sipariş ID' }
    }
    return orderService.getOrderDetails(orderId)
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_TRANSFER, async (_, orderId, targetTableId) => {
    const validation = validateInput(orderSchemas.transfer, { orderId, targetTableId })
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.transferTable(validation.data.orderId, validation.data.targetTableId)
  })

  ipcMain.handle(IPC_CHANNELS.ORDERS_MERGE, async (_, sourceOrderId, targetOrderId) => {
    const validation = validateInput(orderSchemas.merge, { sourceOrderId, targetOrderId })
    if (!validation.success) return { success: false, error: validation.error }
    return orderService.mergeTables(validation.data.sourceOrderId, validation.data.targetOrderId)
  })
}
