import { create, type StateCreator } from 'zustand'
import { cafeApi, type Order, type PaymentMethod } from '@/lib/api'
import { useCartStore } from './useCartStore'
import { useTableStore } from './useTableStore'

// --- Types ---

interface OrderData {
  currentOrder: Order | null
  isLoading: boolean
  error: string | null
  isLocked: boolean
}

interface OrderActions {
  loadOrderForTable: (tableId: string) => Promise<void>
  createOrderForTable: (tableId: string) => Promise<Order>
  addItemToOrder: (productId: string, quantity: number, unitPrice: number) => Promise<void>
  updateOrderItem: (orderItemId: string, quantity: number) => Promise<void>
  removeOrderItem: (orderItemId: string) => Promise<void>
  syncCartToOrder: () => Promise<void>
  processPayment: (amount: number, method: PaymentMethod) => Promise<boolean>
  markItemsPaid: (items: { id: string; quantity: number }[]) => Promise<void>
  deleteOrder: (orderId: string) => Promise<void>
  clearOrder: () => void
  toggleLock: () => Promise<void>
  setLocked: (locked: boolean) => void
}

type OrderStore = OrderData & OrderActions

// --- Helpers ---

/**
 * Reusable helper to sync the global cart store with an order's items.
 * Ensures the items in the cart UI matches exactly what is in the DB.
 */
const syncCartWithOrder = (order: Order | null): void => {
  const cartStore = useCartStore.getState()
  cartStore.clearCart()

  if (order?.items) {
    order.items.forEach((item) => {
      if (item.product) {
        // Add items one by one based on quantity
        for (let i = 0; i < item.quantity; i++) {
          cartStore.addItem(item.product)
        }
      }
    })
  }
}

// --- Slices ---

const createOrderDataSlice: StateCreator<OrderStore, [], [], OrderData> = () => ({
  currentOrder: null,
  isLoading: false,
  error: null,
  isLocked: false
})

const createOrderActionSlice: StateCreator<OrderStore, [], [], OrderActions> = (set, get) => ({
  loadOrderForTable: async (tableId: string) => {
    set({ isLoading: true, error: null })
    try {
      const order = await cafeApi.orders.getOpenByTable(tableId)
      set({ currentOrder: order, isLoading: false, isLocked: order?.isLocked ?? false })
      syncCartWithOrder(order)
    } catch (error) {
      set({ error: String(error), isLoading: false })
    }
  },

  createOrderForTable: async (tableId: string) => {
    set({ isLoading: true, error: null })
    try {
      const order = await cafeApi.orders.create(tableId)
      set({ currentOrder: order, isLoading: false })
      return order
    } catch (error) {
      set({ error: String(error), isLoading: false })
      throw error
    }
  },

  addItemToOrder: async (productId: string, quantity: number, unitPrice: number) => {
    const { currentOrder } = get()
    const tableId = useTableStore.getState().selectedTableId

    if (!tableId) return

    let orderId = currentOrder?.id

    // Create order if it doesn't exist
    if (!orderId) {
      const newOrder = await get().createOrderForTable(tableId)
      orderId = newOrder.id
    }

    try {
      const updatedOrder = await cafeApi.orders.addItem(orderId, productId, quantity, unitPrice)
      set({ currentOrder: updatedOrder })
      syncCartWithOrder(updatedOrder)
      useTableStore.getState().refreshTableStatus()
    } catch (error) {
      set({ error: String(error) })
    }
  },

  updateOrderItem: async (orderItemId: string, quantity: number) => {
    try {
      const updatedOrder = await cafeApi.orders.updateItem(orderItemId, quantity)
      set({ currentOrder: updatedOrder })
      syncCartWithOrder(updatedOrder)
    } catch (error) {
      set({ error: String(error) })
    }
  },

  removeOrderItem: async (orderItemId: string) => {
    try {
      const updatedOrder = await cafeApi.orders.removeItem(orderItemId)
      set({ currentOrder: updatedOrder })
      syncCartWithOrder(updatedOrder)

      // If no items left, order might be empty
      if (updatedOrder.items?.length === 0) {
        useTableStore.getState().refreshTableStatus()
      }
    } catch (error) {
      set({ error: String(error) })
    }
  },

  syncCartToOrder: async () => {
    const { currentOrder } = get()
    const cartItems = useCartStore.getState().items
    const tableId = useTableStore.getState().selectedTableId

    if (!tableId || cartItems.length === 0) return

    let orderId = currentOrder?.id

    // Create order if needed
    if (!orderId) {
      const newOrder = await get().createOrderForTable(tableId)
      orderId = newOrder.id
    }

    // Add all cart items to order
    for (const item of cartItems) {
      await cafeApi.orders.addItem(orderId, item.productId, item.quantity, item.unitPrice)
    }

    // Reload order
    await get().loadOrderForTable(tableId)
  },

  processPayment: async (amount: number, method: PaymentMethod) => {
    const { currentOrder } = get()
    if (!currentOrder) return false

    try {
      const result = await cafeApi.payments.create(currentOrder.id, amount, method)

      // If order is closed, clear everything and refresh
      if (result.order.status === 'CLOSED') {
        set({ currentOrder: null })
        useCartStore.getState().clearCart()
        useTableStore.getState().refreshTableStatus()
        return true
      }

      // Partial payment - update order state and sync cart
      set({ currentOrder: result.order })
      syncCartWithOrder(result.order)
      return false
    } catch (error) {
      set({ error: String(error) })
      return false
    }
  },

  deleteOrder: async (orderId: string) => {
    try {
      await cafeApi.orders.delete(orderId)
      set({ currentOrder: null })
      useCartStore.getState().clearCart()
      useTableStore.getState().refreshTableStatus()
    } catch (error) {
      set({ error: String(error) })
    }
  },

  clearOrder: () => {
    set({ currentOrder: null, error: null, isLocked: false })
    useCartStore.getState().clearCart()
  },

  toggleLock: async () => {
    const { currentOrder, isLocked } = get()
    const newLockedState = !isLocked
    set({ isLocked: newLockedState })

    if (currentOrder) {
      try {
        await cafeApi.orders.update(currentOrder.id, { isLocked: newLockedState })
        // Update local currentOrder state
        set((state) => ({
          currentOrder: state.currentOrder
            ? { ...state.currentOrder, isLocked: newLockedState }
            : null
        }))
        useTableStore.getState().refreshTableStatus()
      } catch (error) {
        console.error('Failed to persist lock state:', error)
        // Revert on error
        set({ isLocked: isLocked, error: 'Kilit durumu güncellenemedi' })
      }
    }
  },

  markItemsPaid: async (items: { id: string; quantity: number }[]) => {
    try {
      const updatedOrder = await cafeApi.orders.markItemsPaid(items)
      set({ currentOrder: updatedOrder })
      syncCartWithOrder(updatedOrder)
      useTableStore.getState().refreshTableStatus()
    } catch (error) {
      set({ error: String(error) })
    }
  },

  setLocked: (locked: boolean) => {
    set({ isLocked: locked })
  }
})

// --- Final Store Composition ---

export const useOrderStore = create<OrderStore>()((...a) => ({
  ...createOrderDataSlice(...a),
  ...createOrderActionSlice(...a)
}))
