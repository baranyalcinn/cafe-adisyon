import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { cafeApi, Table } from '../lib/api'

export function useTables(interval: number | false = 10000): UseQueryResult<Table[], Error> {
  return useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      // We can use the service directly or via api wrapper
      return cafeApi.tables.getWithStatus()
    },
    staleTime: 5_000, // Polling handles freshness; avoid redundant refetches on mount/focus
    // Refresh interval for polling (until we have websockets)
    refetchInterval: interval
  })
}
