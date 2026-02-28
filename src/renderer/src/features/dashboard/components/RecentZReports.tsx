'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { DailySummary } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Banknote, Calendar, CreditCard, History, ReceiptText } from 'lucide-react'
import React, { memo, useCallback, useMemo, useState } from 'react'
import { useDashboardContext } from '../context/DashboardContext'

// ============================================================================
// Constants & Utils
// ============================================================================

const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık'
]
const MONTH_OPTIONS_TR = MONTHS.map((m) => m.toLocaleUpperCase('tr-TR'))

const START_YEAR = 2025
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: Math.max(1, CURRENT_YEAR - START_YEAR + 1) }, (_, i) =>
  (START_YEAR + i).toString()
).reverse()

// Component dışında tanımlanarak her render'da yeniden oluşması engellendi
const FILTER_CHIPS = [
  { label: 'Son 30 Gün', value: 'all' },
  ...MONTHS.map((m, i) => ({ label: m, value: i.toString() }))
]

// Date key generator for O(1) map lookups - Tip kontrolü ile hızlandırıldı
const getDateKey = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// ============================================================================
// Sub-Components (Memoized for Performance)
// ============================================================================

const ReportDetailDialog = memo(function ReportDetailDialog({
  report,
  onClose
}: {
  report: DailySummary | null
  onClose: () => void
}): React.JSX.Element {
  return (
    <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[480px] p-0 overflow-hidden border-border bg-card shadow-2xl rounded-[2.5rem] [&>button]:hidden"
        aria-describedby={undefined}
      >
        <VisuallyHidden.Root asChild>
          <DialogTitle>Rapor Detayı</DialogTitle>
        </VisuallyHidden.Root>

        {report && (
          <div className="flex flex-col">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">Rapor Detayı</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold mt-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(report.date).toLocaleDateString('tr-TR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <ReceiptText className="w-7 h-7 text-primary" />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="px-8 pb-6 grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-border/50 bg-primary/5 space-y-1.5 shadow-sm">
                <span className="text-[10px] font-black text-primary/70 tracking-widest uppercase">
                  Günlük Hasılat
                </span>
                <div className="text-2xl font-black tabular-nums text-foreground">
                  {formatCurrency(report.totalRevenue)}
                </div>
              </div>
              <div className="p-5 rounded-2xl border border-border/50 bg-muted/30 space-y-1.5 shadow-sm">
                <span className="text-[10px] font-black text-muted-foreground/60 tracking-widest uppercase">
                  Toplam Sipariş
                </span>
                <div className="text-2xl font-black tabular-nums text-foreground">
                  {report.orderCount}{' '}
                  <span className="text-sm text-muted-foreground font-bold">adet</span>
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="px-8 pb-8 space-y-3">
              <h4 className="text-[10px] font-black text-muted-foreground/60 tracking-[0.2em] uppercase">
                Ödeme Kanalları
              </h4>
              <div className="border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/60 shadow-sm">
                {/* Cash Row */}
                <div className="flex justify-between items-center px-5 py-4 bg-background hover:bg-emerald-500/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="font-bold text-sm text-foreground">Nakit</span>
                  </div>
                  <span className="font-black text-lg tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(report.totalCash)}
                  </span>
                </div>

                {/* Card Row */}
                <div className="flex justify-between items-center px-5 py-4 bg-background hover:bg-blue-500/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-bold text-sm text-foreground">Kart</span>
                  </div>
                  <span className="font-black text-lg tabular-nums text-blue-600 dark:text-blue-400">
                    {formatCurrency(report.totalCard)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="px-8 pb-8">
              <Button
                onClick={onClose}
                className="w-full h-14 rounded-2xl font-black text-sm tracking-widest bg-muted text-foreground hover:bg-muted/80 uppercase shadow-sm transition-all active:scale-[0.98]"
              >
                Kapat
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
})

const FilterChipBar = memo(function FilterChipBar({
  filterMonth,
  setFilterMonth
}: {
  filterMonth: string
  setFilterMonth: (v: string) => void
}): React.JSX.Element {
  return (
    <div className="w-full">
      <div className="flex w-full gap-1.5 pb-2 mb-2">
        {FILTER_CHIPS.map((chip, index) => {
          const isFirst = index === 0
          const isActive = filterMonth === chip.value

          return (
            <button
              key={chip.value}
              onClick={() => setFilterMonth(chip.value)}
              className={cn(
                'flex-1 min-w-0 h-9 px-0.5 rounded-xl font-black tracking-wide transition-all duration-200 truncate flex items-center justify-center border',
                isFirst ? 'text-[12px]' : 'text-[11.5px] leading-tight',
                isActive
                  ? isFirst
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-md ring-2 ring-emerald-500/50 ring-offset-1 ring-offset-background border-transparent'
                    : 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary ring-offset-1 ring-offset-background border-transparent'
                  : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
              )}
              title={chip.label}
            >
              <span className="truncate">{chip.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
})

const ReportGridCell = memo(function ReportGridCell({
  date,
  report,
  isToday,
  onClick
}: {
  date: Date
  report: DailySummary | null
  isToday: boolean
  onClick: (r: DailySummary) => void
}): React.JSX.Element {
  const day = date.getDate()
  const weekday = date.toLocaleDateString('tr-TR', { weekday: 'short' })

  return (
    <button
      onClick={() => report && onClick(report)}
      disabled={!report}
      className={cn(
        'group relative flex flex-col items-center justify-between p-3.5 aspect-square rounded-[1.25rem] transition-all duration-300',
        'border-2 border-transparent',
        report
          ? 'bg-card shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-1 cursor-pointer ring-1 ring-border/50'
          : 'bg-muted/10 opacity-60 grayscale cursor-default border-dashed border-border/50'
      )}
    >
      {/* Day & Weekday */}
      <div className="flex flex-col items-start w-full leading-none gap-1">
        <div className="flex items-center justify-between w-full">
          <span
            className={cn(
              'text-[16px] font-black tabular-nums tracking-tight',
              isToday
                ? 'text-primary'
                : 'text-foreground group-hover:text-primary transition-colors'
            )}
          >
            {day}
          </span>
          {report && (
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          )}
        </div>
        <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase w-full text-left">
          {weekday}
        </span>
      </div>

      {/* Revenue or Placeholder */}
      <div className="flex-1 flex items-end justify-start w-full mt-1 pb-0.5">
        {report ? (
          <span className="text-[14px] font-black tabular-nums tracking-tighter text-foreground leading-tight">
            {formatCurrency(report.totalRevenue).replace(',00', '')}
          </span>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-border" />
          </div>
        )}
      </div>

      {isToday && !report && (
        <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
      )}
    </button>
  )
})

// ============================================================================
// Main Component
// ============================================================================

export function RecentZReports(): React.JSX.Element {
  const { zReportHistory, filterMonth, setFilterMonth, filterYear, setFilterYear } =
    useDashboardContext()
  const [selectedReport, setSelectedReport] = useState<DailySummary | null>(null)

  const handleReportClick = useCallback((report: DailySummary) => {
    setSelectedReport(report)
  }, [])

  const closeDialog = useCallback(() => {
    setSelectedReport(null)
  }, [])

  // 31 Günlük Veri Setini Hazırla (O(n) Optimizasyonu ve Hafıza Yönetimi)
  const gridData = useMemo(() => {
    const year = parseInt(filterYear)
    let dates: Date[] = []

    if (filterMonth === 'all') {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const baseTime = now.getTime()

      // Performans: new Date() manipülasyonları yerine Timestamp üzerinden matematiksel çıkarma
      dates = Array.from({ length: 30 }, (_, i) => new Date(baseTime - (29 - i) * 86400000))
    } else {
      const month = parseInt(filterMonth)
      const dayCount = new Date(year, month + 1, 0).getDate()
      dates = Array.from({ length: dayCount }, (_, i) => new Date(year, month, i + 1))
    }

    const reportMap = new Map<string, DailySummary>()
    // for döngüsü forEach'ten daha performanslıdır
    for (let i = 0; i < zReportHistory.length; i++) {
      const report = zReportHistory[i]
      reportMap.set(getDateKey(report.date), report)
    }

    // Bugünün stringini 1 kere hesapla (Cell içinde 31 kere hesaplamaktan kurtarır)
    const todayStr = new Date().toDateString()

    return dates.map((date) => {
      const key = getDateKey(date)
      return {
        key,
        date,
        isToday: date.toDateString() === todayStr,
        report: reportMap.get(key) || null
      }
    })
  }, [zReportHistory, filterMonth, filterYear])

  const isAllSelected = filterMonth === 'all'

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[1000ms] fill-mode-both">
        <div className="bg-card border border-border/60 rounded-[2rem] shadow-sm text-foreground overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-border/40 bg-muted/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner border border-primary/10">
                <History className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground tracking-tight">
                  Z-Raporu Geçmişi
                </h3>
                <p className="text-[11px] text-muted-foreground font-black tracking-widest uppercase opacity-80 mt-0.5">
                  {isAllSelected
                    ? 'SON 30 GÜN'
                    : `${MONTH_OPTIONS_TR[parseInt(filterMonth)]} ${filterYear}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex flex-col items-end mr-2 transition-opacity duration-300',
                  isAllSelected && 'opacity-40'
                )}
              >
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5 opacity-60">
                  YIL
                </span>
                <Select value={filterYear} onValueChange={setFilterYear} disabled={isAllSelected}>
                  <SelectTrigger className="h-9 w-24 bg-background border-border/50 shadow-sm text-[13px] font-black rounded-xl hover:bg-muted/50 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/50 shadow-xl">
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem
                        key={y}
                        value={y}
                        className="text-[13px] font-black cursor-pointer"
                      >
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Filter chip bar */}
          <div className="px-8 mt-4 mb-2">
            <FilterChipBar filterMonth={filterMonth} setFilterMonth={setFilterMonth} />
          </div>

          {/* Grid View */}
          <div className="px-8 pb-8">
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {gridData.map(({ key, date, report, isToday }) => (
                <ReportGridCell
                  key={key}
                  date={date}
                  report={report}
                  isToday={isToday}
                  onClick={handleReportClick}
                />
              ))}
            </div>

            {gridData.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground/40 bg-muted/10 rounded-3xl mt-2 border border-dashed border-border/50">
                <History className="w-14 h-14 opacity-30" />
                <span className="text-[12px] font-black tracking-[0.2em] uppercase">
                  Rapor Bulunamadı
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportDetailDialog report={selectedReport} onClose={closeDialog} />
    </>
  )
}
