import { useDashboardStats } from '@/hooks/useDashboardStats'
import {
  type DailySummary,
  type ExtendedDashboardStats,
  type MonthlyReport,
  type RevenueTrendItem
} from '@/lib/api'
import React, { createContext, useContext, useState } from 'react'

interface DashboardContextType {
  filterMonth: string
  setFilterMonth: (val: string) => void
  filterYear: string
  setFilterYear: (val: string) => void

  stats: ExtendedDashboardStats | undefined
  revenueTrend: RevenueTrendItem[]
  zReportHistory: DailySummary[]
  monthlyReports: MonthlyReport[]

  isLoading: boolean
  isError: boolean
  refetchAll: () => void

  showEndOfDayModal: boolean
  setShowEndOfDayModal: (val: boolean) => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString())
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)

  const { stats, revenueTrend, zReportHistory, monthlyReports, isLoading, isError, refetchAll } =
    useDashboardStats(filterMonth, filterYear)

  const value = {
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    stats,
    revenueTrend,
    zReportHistory,
    monthlyReports,
    isLoading,
    isError,
    refetchAll,
    showEndOfDayModal,
    setShowEndOfDayModal
  }

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboardContext(): DashboardContextType {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider')
  }
  return context
}
