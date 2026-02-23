import { z } from 'zod'
import { orderSchemas, paymentSchemas } from '../../../shared/ipc-schemas'
import { IPC_CHANNELS } from '../../../shared/types'
import { orderService } from '../../services/OrderService'
import { createValidatedHandler } from '../utils/ipcWrapper'

export function registerOrderHandlers(): void {
  // GET — Masa için açık adisyon
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_GET_OPEN_BY_TABLE,
    orderSchemas.getByTable,
    (data) => orderService.getOpenOrderForTable(data.tableId),
    'Adisyon getirilirken hata oluştu'
  )

  // CREATE — Yeni adisyon
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_CREATE,
    orderSchemas.create,
    (data) => orderService.createOrder(data.tableId),
    'Adisyon oluşturulurken hata oluştu'
  )

  // ADD ITEM — Ürün ekle
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_ADD_ITEM,
    orderSchemas.addItem,
    (data) => orderService.addItem(data.orderId, data.productId, data.quantity, data.unitPrice),
    'Ürün eklenirken hata oluştu'
  )

  // UPDATE ITEM — Miktar güncelle
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_UPDATE_ITEM,
    orderSchemas.updateItem,
    (data) => orderService.updateItem(data.orderItemId, data.quantity),
    'Ürün güncellenirken hata oluştu'
  )

  // REMOVE ITEM — Ürün sil
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_REMOVE_ITEM,
    orderSchemas.removeItem,
    (data) => orderService.removeItem(data.orderItemId),
    'Ürün silinirken hata oluştu'
  )

  // UPDATE — Adisyon güncelle
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_UPDATE,
    orderSchemas.update,
    (data) => orderService.updateOrder(data.orderId, data.data),
    'Adisyon güncellenirken hata oluştu'
  )

  // DELETE — Adisyon iptal
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_DELETE,
    orderSchemas.delete,
    (data) => orderService.deleteOrder(data.orderId),
    'Adisyon iptal edilirken hata oluştu'
  )

  // TOGGLE LOCK — Kilit durumu değiştir
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_TOGGLE_LOCK,
    orderSchemas.toggleLock,
    (data) => orderService.toggleLock(data.orderId, data.isLocked),
    'Masa kilit durumu değiştirilirken hata oluştu'
  )

  // TRANSFER — Masa taşı
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_TRANSFER,
    orderSchemas.transfer,
    (data) => orderService.transferTable(data.orderId, data.targetTableId),
    'Masa taşınırken hata oluştu'
  )

  // MERGE — Masaları birleştir
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_MERGE,
    orderSchemas.merge,
    (data) => orderService.mergeTables(data.sourceOrderId, data.targetOrderId),
    'Masalar birleştirilirken hata oluştu'
  )

  // GET HISTORY — Sipariş geçmişi
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_GET_HISTORY,
    orderSchemas.getHistory,
    (data) => orderService.getOrderHistory(data ?? {}),
    'Geçmiş alınırken hata oluştu'
  )

  // GET DETAILS — Sipariş detayı
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_GET_DETAILS,
    z.object({ orderId: z.string().min(1, 'Geçersiz sipariş ID') }),
    (data) => orderService.getOrderDetails(data.orderId),
    'Sipariş detayları alınırken hata oluştu'
  )

  // MARK ITEMS PAID — Parçalı ödeme
  createValidatedHandler(
    IPC_CHANNELS.ORDERS_MARK_ITEMS_PAID,
    orderSchemas.markItemsPaid,
    (data) => orderService.markItemsPaid(data.items, data.paymentDetails),
    'Parçalı ödeme alınırken hata oluştu'
  )

  // PAYMENT CREATE — Ödeme al
  createValidatedHandler(
    IPC_CHANNELS.PAYMENTS_CREATE,
    paymentSchemas.create,
    (data) =>
      orderService.processPayment(data.orderId, data.amount, data.paymentMethod, data.options),
    'Ödeme alınırken hata oluştu'
  )
}
