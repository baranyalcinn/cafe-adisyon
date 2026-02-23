import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query'
import { useEffect } from 'react'
import { cafeApi, Table } from '../lib/api'

export function useTables(): UseQueryResult<Table[], Error> {
  const query = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      // We can use the service directly or via api wrapper
      return cafeApi.tables.getWithStatus()
    },
    staleTime: 1000 * 60 * 60, // 1 hour (infinity effectively, we rely on event invalidation)
    refetchOnWindowFocus: true // Refetch when window gains focus just in case
  })

  // Listen for global updates (orders, payments, etc.) to refresh tables
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleUpdate = (): void => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['order'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }

    // Subscribe to IPC event
    const cleanup = window.api.on('dashboard:update', handleUpdate)

    return () => {
      cleanup()
    }
  }, [queryClient])

  return query
}
