import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { cafeApi, type Category, type Product } from '../lib/api'

// ============================================================================
// Constants & Stable References (Boş dizi tuzağını önler)
// ============================================================================

const EMPTY_PRODUCTS: Product[] = []
const EMPTY_CATEGORIES: Category[] = []

// ============================================================================
// Types
// ============================================================================

interface InventoryHookResult {
  products: Product[]
  categories: Category[]
  isLoading: boolean
  isError: boolean
  errors: {
    products: unknown
    categories: unknown
  }
  refetchProducts: () => void
  refetchCategories: () => void
}

interface PrefetchResult {
  prefetchAll: () => Promise<void>
}

// ============================================================================
// Prefetch Hook (Uygulama Açılışı İçin)
// ============================================================================

export function useInventoryPrefetch(): PrefetchResult {
  const queryClient = useQueryClient()

  const prefetchAll = useCallback(async (): Promise<void> => {
    try {
      const response = await window.api.system.getBootBundle()
      if (response.success && response.data) {
        // Cache'i doldur ve anında refetch atmasını engelle
        queryClient.setQueryData(['products'], response.data.products)
        queryClient.setQueryData(['categories'], response.data.categories)
        queryClient.setQueryData(['tables'], response.data.tables)
      }
    } catch (error) {
      console.error('Failed to prefetch boot bundle:', error)
    }
  }, [queryClient])

  return useMemo(() => ({ prefetchAll }), [prefetchAll])
}

// ============================================================================
// Main Hook (Veri Sağlayıcısı)
// ============================================================================

export function useInventory(): InventoryHookResult {
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: (): Promise<Product[]> => cafeApi.products.getAll(),
    staleTime: 1000 * 60 * 30 // 30 Dakika
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: (): Promise<Category[]> => cafeApi.categories.getAll(),
    staleTime: 1000 * 60 * 60 // 1 Saat
  })

  // Hook'un döndürdüğü objeyi sabitliyoruz ki tüketen bileşenler (OrderView vb.)
  // referans değişiminden dolayı gereksiz yere tekrar render edilmesin.
  return useMemo<InventoryHookResult>(
    () => ({
      products: productsQuery.data ?? EMPTY_PRODUCTS,
      categories: categoriesQuery.data ?? EMPTY_CATEGORIES,
      isLoading: productsQuery.isLoading || categoriesQuery.isLoading,
      isError: productsQuery.isError || categoriesQuery.isError,
      errors: {
        products: productsQuery.error,
        categories: categoriesQuery.error
      },
      refetchProducts: productsQuery.refetch,
      refetchCategories: categoriesQuery.refetch
    }),
    [
      productsQuery.data,
      productsQuery.isLoading,
      productsQuery.isError,
      productsQuery.error,
      productsQuery.refetch,
      categoriesQuery.data,
      categoriesQuery.isLoading,
      categoriesQuery.isError,
      categoriesQuery.error,
      categoriesQuery.refetch
    ]
  )
}
