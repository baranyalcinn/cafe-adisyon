import { describe, it, expect } from 'vitest'

/**
 * Tests for Z-report date logic and revenue calculations.
 * These replicate the smart dating logic used in ReportingService.
 */

// Replicates the "smart dating" logic from ReportingService.generateZReport
// Reports generated before 5 AM are assigned to the previous day
function getReportDate(now: Date): string {
  const currentHour = now.getHours()
  const reportDate = new Date(now)

  if (currentHour < 5) {
    reportDate.setDate(reportDate.getDate() - 1)
  }

  // Use local date components to avoid UTC conversion issues
  const year = reportDate.getFullYear()
  const month = String(reportDate.getMonth() + 1).padStart(2, '0')
  const day = String(reportDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Replicates the net profit calculation
function calculateNetProfit(cashTotal: number, cardTotal: number, expenses: number): number {
  return cashTotal + cardTotal - expenses
}

// Replicates the period start/end calculation for Z-reports
function getZReportPeriod(reportDate: string): { start: Date; end: Date } {
  const start = new Date(`${reportDate}T05:00:00.000Z`)
  const endDate = new Date(start)
  endDate.setDate(endDate.getDate() + 1)
  return { start, end: endDate }
}

describe('Z-Report Smart Dating', () => {
  it('should assign to current day for daytime reports (after 5 AM)', () => {
    const noon = new Date(2025, 0, 15, 12, 0, 0) // Jan 15, 12:00 local
    expect(getReportDate(noon)).toBe('2025-01-15')
  })

  it('should assign to current day for evening reports', () => {
    const evening = new Date(2025, 0, 15, 23, 30, 0) // Jan 15, 23:30 local
    expect(getReportDate(evening)).toBe('2025-01-15')
  })

  it('should assign to previous day for early morning (before 5 AM)', () => {
    const earlyMorning = new Date(2025, 0, 15, 2, 30, 0) // Jan 15, 02:30 local
    expect(getReportDate(earlyMorning)).toBe('2025-01-14')
  })

  it('should assign to previous day at exactly midnight', () => {
    const midnight = new Date(2025, 0, 15, 0, 0, 0) // Jan 15, 00:00 local
    expect(getReportDate(midnight)).toBe('2025-01-14')
  })

  it('should assign to current day at exactly 5 AM', () => {
    const fiveAm = new Date(2025, 0, 15, 5, 0, 0) // Jan 15, 05:00 local
    expect(getReportDate(fiveAm)).toBe('2025-01-15')
  })

  it('should handle month boundary (early morning Jan 1)', () => {
    const newYearEarlyMorning = new Date(2025, 0, 1, 3, 0, 0) // Jan 1, 03:00 local
    expect(getReportDate(newYearEarlyMorning)).toBe('2024-12-31')
  })
})

describe('Net Profit Calculation', () => {
  it('should calculate net profit correctly', () => {
    expect(calculateNetProfit(50000, 30000, 10000)).toBe(70000) // 500+300-100=700 TL
  })

  it('should handle zero expenses', () => {
    expect(calculateNetProfit(50000, 30000, 0)).toBe(80000)
  })

  it('should handle negative profit (expenses exceed revenue)', () => {
    expect(calculateNetProfit(10000, 5000, 20000)).toBe(-5000)
  })

  it('should handle zero revenue day', () => {
    expect(calculateNetProfit(0, 0, 5000)).toBe(-5000)
  })
})

describe('Z-Report Period Boundaries', () => {
  it('should create 24-hour period starting at 5 AM', () => {
    const { start, end } = getZReportPeriod('2025-01-15')
    expect(start.toISOString()).toBe('2025-01-15T05:00:00.000Z')
    expect(end.toISOString()).toBe('2025-01-16T05:00:00.000Z')
  })

  it('should span exactly 24 hours', () => {
    const { start, end } = getZReportPeriod('2025-06-15')
    const hoursDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    expect(hoursDiff).toBe(24)
  })
})
