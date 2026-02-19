import type { CartItem, Product } from '@/lib/api'
import { create } from 'zustand'

interface CartState {
  items: CartItem[]
  totalAmount: number
  itemCount: number

  // Actions
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void

  // Computed (Legacy, use state properties mapping for reactivity)
  getTotal: () => number
  getItemCount: () => number
}

const calculateTotals = (items: CartItem[]): { totalAmount: number; itemCount: number } => {
  return {
    totalAmount: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalAmount: 0,
  itemCount: 0,

  addItem: (product: Product) => {
    set((state) => {
      let newItems: CartItem[]
      const existingItem = state.items.find((item) => item.productId === product.id)

      if (existingItem) {
        newItems = state.items.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      } else {
        newItems = [
          ...state.items,
          {
            productId: product.id,
            product,
            quantity: 1,
            unitPrice: product.price
          }
        ]
      }
      return { items: newItems, ...calculateTotals(newItems) }
    })
  },

  removeItem: (productId: string) => {
    set((state) => {
      const newItems = state.items.filter((item) => item.productId !== productId)
      return { items: newItems, ...calculateTotals(newItems) }
    })
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }

    set((state) => {
      const newItems = state.items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
      return { items: newItems, ...calculateTotals(newItems) }
    })
  },

  clearCart: () => {
    set({ items: [], totalAmount: 0, itemCount: 0 })
  },

  getTotal: () => {
    return get().totalAmount
  },

  getItemCount: () => {
    return get().itemCount
  }
}))
