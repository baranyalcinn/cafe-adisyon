import { DashboardBundle, ExtendedDashboardStats, RevenueTrendItem } from '../../../shared/types'
import { resolveApi } from './apiClient'

const api = window.api

export const dashboardService = {
  getExtendedStats: (): Promise<ExtendedDashboardStats> =>
    resolveApi(api.dashboard.getExtendedStats()),

  getRevenueTrend: (days: number = 7): Promise<RevenueTrendItem[]> =>
    resolveApi(api.dashboard.getRevenueTrend(days)),

  getBundle: (): Promise<DashboardBundle> => resolveApi(api.dashboard.getBundle())
}
