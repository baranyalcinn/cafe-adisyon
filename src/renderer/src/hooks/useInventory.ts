import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cafeApi, Product, Category } from '../lib/api'

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

  const prefetchAll = async (): Promise<void> => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['products'],
        queryFn: () => cafeApi.products.getAll(),
        staleTime: 1000 * 60 * 5 // 5 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: ['categories'],
        queryFn: () => cafeApi.categories.getAll(),
        staleTime: 1000 * 60 * 60 // 1 hour
      })
    ])
  }

  return { prefetchAll }
}

export function useInventory(): InventoryHookResult {
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => cafeApi.products.getAll(),
    staleTime: 1000 * 60 * 5 // 5 minutes
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
