import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import {
  cafeApi,
  DailySummary,
  ExtendedDashboardStats,
  MonthlyReport,
  RevenueTrendItem
} from '../lib/api'

interface UseDashboardResult {
  stats: ExtendedDashboardStats | undefined
  revenueTrend: RevenueTrendItem[]
  zReportHistory: DailySummary[]
  monthlyReports: MonthlyReport[]
  isLoading: boolean
  isError: boolean
  refetchAll: () => void
}

export function useDashboardStats(
  filterMonth: string = 'all',
  filterYear: string = new Date().getFullYear().toString()
): UseDashboardResult {
  const queryClient = useQueryClient()

  // 1. Dashboard Bundle (stats, trend, monthly stats fetched in ONE call)
  const bundleQuery = useQuery({
    queryKey: ['dashboard', 'bundle'],
    queryFn: () => cafeApi.dashboard.getBundle(),
    staleTime: 30 * 1000, // 30 seconds stale for the whole batch
    refetchOnWindowFocus: true
  })

  // 2. Z-Report History (Historical data - 5m stale unless filtered, left separate for pagination controls)
  const historyQuery = useQuery({
    queryKey: ['dashboard', 'history', filterMonth, filterYear],
    queryFn: async () => {
      let limit = 30
      let startDate: Date | undefined
      let endDate: Date | undefined

      if (filterMonth !== 'all') {
        const month = parseInt(filterMonth)
        const year = parseInt(filterYear)
        startDate = new Date(year, month, 1, 0, 0, 0)
        endDate = new Date(year, month + 1, 0, 23, 59, 59)
        limit = 100
      }

      return cafeApi.zReport.getHistory({
        limit,
        startDate,
        endDate
      })
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData
  })

  // Real-time updates listener
  useEffect(() => {
    // Subscribe to IPC event using the safe bridge that returns a cleanup function
    const cleanup = window.api.on('dashboard:update', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    return () => {
      cleanup()
    }
  }, [queryClient])

  const refetchAll = useCallback((): void => {
    bundleQuery.refetch()
    historyQuery.refetch()
  }, [bundleQuery.refetch, historyQuery.refetch])

  return {
    stats: bundleQuery.data?.stats,
    revenueTrend: bundleQuery.data?.revenueTrend || [],
    zReportHistory: historyQuery.data || [],
    monthlyReports: bundleQuery.data?.monthlyReports || [],
    isLoading: bundleQuery.isLoading || historyQuery.isLoading,
    isError: bundleQuery.isError || historyQuery.isError,
    refetchAll
  }
}
