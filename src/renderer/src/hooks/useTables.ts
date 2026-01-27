import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { cafeApi, Table } from '../lib/api'

export function useTables(): UseQueryResult<Table[], Error> {
  return useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      // We can use the service directly or via api wrapper
      return cafeApi.tables.getWithStatus()
    },
    // Refresh every 10 seconds for simple polling (until we have websockets)
    refetchInterval: 10000
  })
}
