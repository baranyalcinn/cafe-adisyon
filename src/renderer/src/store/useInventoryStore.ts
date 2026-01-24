import { create, type StateCreator } from 'zustand'
import { cafeApi, type Product, type Category } from '@/lib/api'

// --- Types ---

interface InventoryData {
  products: Product[]
  categories: Category[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null
}

interface InventoryActions {
  fetchInventory: (force?: boolean) => Promise<void>
  clearInventory: () => void
  addProduct: (product: Product) => void
  updateProduct: (product: Product) => void
  removeProduct: (productId: string) => void
  addCategory: (category: Category) => void
  updateCategory: (category: Category) => void
  removeCategory: (categoryId: string) => void
}

type InventoryStore = InventoryData & InventoryActions

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// --- Slices ---

const createInventoryDataSlice: StateCreator<InventoryStore, [], [], InventoryData> = () => ({
  products: [],
  categories: [],
  isLoading: false,
  error: null,
  lastFetched: null
})

const createInventoryActionSlice: StateCreator<InventoryStore, [], [], InventoryActions> = (
  set,
  get
) => ({
  fetchInventory: async (force = false) => {
    const { lastFetched, isLoading } = get()
    if (isLoading) return
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_DURATION) return

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
      products: state.products.filter((p) => p.categoryId !== categoryId)
    }))
  }
})

// --- Final Store Composition ---

export const useInventoryStore = create<InventoryStore>()((...a) => ({
  ...createInventoryDataSlice(...a),
  ...createInventoryActionSlice(...a)
}))
