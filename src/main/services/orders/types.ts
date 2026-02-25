import { Prisma } from '../../../generated/prisma/client'
import { Order } from '../../../shared/types'

export type PrismaTransaction = Prisma.TransactionClient

export interface SplitPayment {
  id: string
  quantity: number
  productName: string
  orderItem: {
    orderId: string
    productId: string
    quantity: number
    unitPrice: number
  }
}

export const ORDER_ITEM_SELECT = {
  id: true,
  orderId: true,
  productId: true,
  quantity: true,
  unitPrice: true,
  isPaid: true,
  product: { select: { id: true, name: true, price: true, categoryId: true } }
} as const

export const ORDER_SELECT = {
  id: true,
  tableId: true,
  status: true,
  totalAmount: true,
  isLocked: true,
  createdAt: true,
  updatedAt: true,
  table: { select: { id: true, name: true } },
  items: { select: ORDER_ITEM_SELECT },
  payments: true
} as const

export type OrderWithRelations = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>

export const SYSTEM_CONFIG = {
  BROADCAST_DELAY_MS: 500,
  MERGE_TIMEOUT_MS: 20000,
  EVENTS: {
    ORDER_UPDATED: 'order:updated'
  }
} as const

export function formatOrder(order: OrderWithRelations | null): Order | null {
  if (!order) return null
  return order as unknown as Order
}
