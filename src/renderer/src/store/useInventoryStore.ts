import { create } from 'zustand'
import { cafeApi, type Product, type Category } from '@/lib/api'

interface InventoryState {
  products: Product[]
  categories: Category[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null

  // Actions
  fetchInventory: (force?: boolean) => Promise<void>
  clearInventory: () => void

  // Local Smart Updates (No refetch needed)
  addProduct: (product: Product) => void
  updateProduct: (product: Product) => void
  removeProduct: (productId: string) => void
  addCategory: (category: Category) => void
  updateCategory: (category: Category) => void
  removeCategory: (categoryId: string) => void
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  categories: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchInventory: async (force = false) => {
    const { lastFetched, isLoading } = get()

    // Skip if already loading
    if (isLoading) return

    // Use cache if available and not forced
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
      return
    }

    set({ isLoading: true, error: null })
    try {
      const [products, categories] = await Promise.all([
        cafeApi.products.getAll(),
        cafeApi.categories.getAll()
      ])

      set({
        products,
        categories,
        isLoading: false,
        lastFetched: Date.now()
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Ürünler yüklenemedi',
        isLoading: false
      })
    }
  },

  clearInventory: () => {
    set({ products: [], categories: [], lastFetched: null })
  },

  addProduct: (product) => {
    set((state) => ({ products: [...state.products, product] }))
  },

  updateProduct: (product) => {
    set((state) => ({
      products: state.products.map((p) => (p.id === product.id ? product : p))
    }))
  },

  removeProduct: (productId) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== productId)
    }))
  },

  addCategory: (category) => {
    set((state) => ({ categories: [...state.categories, category] }))
  },

  updateCategory: (category) => {
    set((state) => ({
      categories: state.categories.map((c) => (c.id === category.id ? category : c))
    }))
  },

  removeCategory: (categoryId) => {
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== categoryId),
      // Also remove products belonging to this category
      products: state.products.filter((p) => p.categoryId !== categoryId)
    }))
  }
}))
