import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
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

  // 1. Extended Stats (Live data - 30s stale)
  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => cafeApi.dashboard.getExtendedStats(),
    staleTime: 30 * 1000, // 30 seconds stale
    refetchOnWindowFocus: true
  })

  // 2. Revenue Trend (Daily data - 5m stale)
  const trendQuery = useQuery({
    queryKey: ['dashboard', 'trend'],
    queryFn: () => cafeApi.dashboard.getRevenueTrend(7),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  })

  // 3. Z-Report History (Historical data - 5m stale unless filtered)
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

  // 4. Monthly Reports (Historical data - 1h stale)
  const monthlyQuery = useQuery({
    queryKey: ['dashboard', 'monthly'],
    queryFn: () => cafeApi.reports.getMonthly(12),
    staleTime: 60 * 60 * 1000 // 1 hour
  })

  // Real-time updates listener
  useEffect(() => {
    // Listen for 'dashboard:update' event from main process
    const removeListener = (
      window as {
        electron?: { ipcRenderer: { on: (channel: string, callback: () => void) => () => void } }
      }
    ).electron?.ipcRenderer.on('dashboard:update', () => {
      // Invalidate queries to trigger refetch if data is stale
      // We use invalidateQueries instead of refetch to respect staleTime involved in active queries
      // But for 'stats', we want immediate update usually.
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'trend'] })
      // History and Monthly usually don't change intra-day unless Z-Report is cut,
      // but 'dashboard:update' might be generic. Let's invalidate them too but they are cheap.
    })

    return () => {
      removeListener?.()
    }
  }, [queryClient])

  const refetchAll = (): void => {
    statsQuery.refetch()
    trendQuery.refetch()
    historyQuery.refetch()
    monthlyQuery.refetch()
  }

  return {
    stats: statsQuery.data,
    revenueTrend: trendQuery.data || [],
    zReportHistory: historyQuery.data || [],
    monthlyReports: monthlyQuery.data || [],
    isLoading:
      statsQuery.isLoading ||
      trendQuery.isLoading ||
      historyQuery.isLoading ||
      monthlyQuery.isLoading,
    isError:
      statsQuery.isError || trendQuery.isError || historyQuery.isError || monthlyQuery.isError,
    refetchAll
  }
}
