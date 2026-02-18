import { commands } from '../lib/bindings'
import { DashboardStats, ExtendedDashboardStats, RevenueTrendItem } from '@shared/types'
import { unwrap } from '../lib/utils'

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const res = await commands.getDashboardStats()
    return unwrap(res)
  },

  async getExtendedStats(): Promise<ExtendedDashboardStats> {
    const res = await commands.getExtendedDashboardStats()
    return unwrap(res)
  },

  async getRevenueTrend(days: number = 7): Promise<RevenueTrendItem[]> {
    const res = await commands.getRevenueTrend(days)
    return unwrap(res)
  }
}
