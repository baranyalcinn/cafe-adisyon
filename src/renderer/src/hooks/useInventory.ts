import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { cafeApi, Category, Product } from '../lib/api'

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

export function useInventoryPrefetch(): { prefetchAll: () => Promise<void> } {
  const queryClient = useQueryClient()

  const prefetchAll = useCallback(async (): Promise<void> => {
    try {
      const response = await window.api.system.getBootBundle()
      if (response.success && response.data) {
        // Prime the cache with the batched response. Ensure high staleTime prevents immediate refetches.
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

export function useInventory(): InventoryHookResult {
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => cafeApi.products.getAll(),
    staleTime: 1000 * 60 * 30 // 30 minutes
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => cafeApi.categories.getAll(),
    staleTime: 1000 * 60 * 60 // 1 hour
  })

  return {
    products: productsQuery.data || [],
    categories: categoriesQuery.data || [],
    isLoading: productsQuery.isLoading || categoriesQuery.isLoading,
    isError: productsQuery.isError || categoriesQuery.isError,
    errors: {
      products: productsQuery.error,
      categories: categoriesQuery.error
    },
    refetchProducts: productsQuery.refetch,
    refetchCategories: categoriesQuery.refetch
  }
}
