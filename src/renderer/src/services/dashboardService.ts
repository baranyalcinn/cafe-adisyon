import { ExtendedDashboardStats, RevenueTrendItem } from '../../../shared/types'

const api = window.api

export const dashboardService = {
  async getExtendedStats(): Promise<ExtendedDashboardStats> {
    const result = await api.dashboard.getExtendedStats()
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async getRevenueTrend(days: number = 7): Promise<RevenueTrendItem[]> {
    const result = await api.dashboard.getRevenueTrend(days)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  async getBundle(): Promise<import('../../../shared/types').DashboardBundle> {
    const result = await api.dashboard.getBundle()
    if (!result.success) throw new Error(result.error)
    return result.data
  }
}
