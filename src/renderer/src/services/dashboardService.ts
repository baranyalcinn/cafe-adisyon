import { DashboardStats, ExtendedDashboardStats, RevenueTrendItem } from '../../../shared/types'

const api = window.api

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const result = await api.dashboard.getStats()
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async getExtendedStats(): Promise<ExtendedDashboardStats> {
    const result = await api.dashboard.getExtendedStats()
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async getRevenueTrend(days: number = 7): Promise<RevenueTrendItem[]> {
    const result = await api.dashboard.getRevenueTrend(days)
    if (!result.success) throw new Error(result.error)
    return result.data
  }
}
