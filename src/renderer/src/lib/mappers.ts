import {
  OrderResponse,
  OrderItemResponse,
  TransactionResponse,
  ExpenseResponse,
  DailySummaryResponse,
  LogResponse,
  MonthlyReportResponse,
  CategoryResponse,
  ProductResponse
} from './bindings'
import {
  Order,
  OrderStatus,
  OrderItem,
  Transaction,
  PaymentMethod,
  Expense,
  DailySummary,
  ActivityLog,
  MonthlyReport,
  Category,
  Product
} from '@shared/types'
import { mapDate } from './utils'

export function mapTransaction(t: TransactionResponse): Transaction {
  return {
    ...t,
    paymentMethod: t.paymentMethod as PaymentMethod,
    createdAt: mapDate(t.createdAt)
  }
}

export function mapOrderItem(i: OrderItemResponse): OrderItem {
  return {
    ...i,
    isPaid: i.isPaid,
    product: i.productName ? ({ name: i.productName } as any) : undefined
  }
}

export function mapOrder(o: OrderResponse): Order {
  return {
    ...o,
    status: o.status as OrderStatus,
    createdAt: mapDate(o.createdAt),
    updatedAt: o.updatedAt ? mapDate(o.updatedAt) : undefined,
    items: o.items ? o.items.map(mapOrderItem) : [],
    payments: o.payments ? o.payments.map(mapTransaction) : []
  }
}

export function mapExpense(e: ExpenseResponse): Expense {
  return {
    ...e,
    category: e.category || undefined,
    paymentMethod: e.paymentMethod as PaymentMethod | undefined,
    createdAt: mapDate(e.createdAt)
  }
}

export function mapDailySummary(s: DailySummaryResponse): DailySummary {
  return {
    ...s,
    date: mapDate(s.date),
    createdAt: mapDate(s.createdAt)
  }
}

export function mapActivityLog(l: LogResponse): ActivityLog {
  return {
    ...l,
    tableName: l.tableName || undefined,
    userName: l.userName || undefined,
    details: l.details || undefined,
    createdAt: mapDate(l.createdAt)
  }
}

export function mapMonthlyReport(m: MonthlyReportResponse): MonthlyReport {
  return {
    ...m,
    monthDate: mapDate(m.monthDate),
    updatedAt: mapDate(m.updatedAt)
  }
}

export function mapCategory(c: CategoryResponse): Category {
  return {
    ...c,
    icon: c.icon || undefined
  }
}
