import { create } from 'zustand'
import type { Product } from '@/lib/api'

// Cart item type
interface CartItem {
  productId: string
  product: Product
  quantity: number
  unitPrice: number
}

interface CartState {
  items: CartItem[]

  // Actions
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void

  // Computed
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product: Product) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.productId === product.id)

      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        }
      }

      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            product,
            quantity: 1,
            unitPrice: product.price
          }
        ]
      }
    })
  },

  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId)
    }))
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    }))
  },

  clearCart: () => {
    set({ items: [] })
  },

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0)
  }
}))
