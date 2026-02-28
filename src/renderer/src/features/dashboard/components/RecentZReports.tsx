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
import { cn, formatCurrency, formatLira } from '@/lib/utils'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Banknote, Calendar, CreditCard, History, ReceiptText } from 'lucide-react'
import React, { useRef, useState } from 'react'
import { useDashboardContext } from '../context/DashboardContext'

// ============================================================================
// Constants & Styles
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

const START_YEAR = 2025
const CURRENT_YEAR = new Date().getFullYear()

const YEAR_OPTIONS = Array.from({ length: Math.max(1, CURRENT_YEAR - START_YEAR + 1) }, (_, i) =>
  (START_YEAR + i).toString()
).reverse()

// ============================================================================
// Sub-Components
// ============================================================================

/** Rapor Detay Modal'ı */
const ReportDetailDialog = ({
  report,
  onClose
}: {
  report: DailySummary | null
  onClose: () => void
}): React.JSX.Element => (
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
                <Calendar className="w-3.5 h-3.5" />
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
            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
              <ReceiptText className="w-6 h-6 text-primary" />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="px-8 pb-6 grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-muted/30 space-y-1">
              <span className="text-[10px] font-black text-muted-foreground/60 tracking-widest uppercase">
                Günlük Hasılat
              </span>
              <div className="text-xl font-black tabular-nums">
                {formatCurrency(report.totalRevenue)}
              </div>
            </div>
            <div className="p-5 rounded-2xl border border-border bg-muted/30 space-y-1">
              <span className="text-[10px] font-black text-muted-foreground/60 tracking-widest uppercase">
                Toplam Sipariş
              </span>
              <div className="text-xl font-black tabular-nums">{report.orderCount} adet</div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="px-8 pb-8 space-y-3">
            <h4 className="text-[10px] font-black text-muted-foreground/60 tracking-[0.2em] uppercase">
              Ödeme Kanalları
            </h4>
            <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
              <div className="flex justify-between items-center px-5 py-4 bg-background hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                    <Banknote className="w-4 h-4 text-success" />
                  </div>
                  <span className="font-bold text-sm">Nakit</span>
                </div>
                <span className="font-black tabular-nums text-success">
                  {formatCurrency(report.totalCash)}
                </span>
              </div>
              <div className="flex justify-between items-center px-5 py-4 bg-background hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-info" />
                  </div>
                  <span className="font-bold text-sm">Kart</span>
                </div>
                <span className="font-black tabular-nums text-info">
                  {formatCurrency(report.totalCard)}
                </span>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="px-8 pb-8">
            <Button
              onClick={onClose}
              className="w-full h-12 rounded-2xl font-black text-xs tracking-widest bg-muted text-foreground hover:bg-muted/80 uppercase"
            >
              Kapat
            </Button>
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
)

// ============================================================================
// Month Chip Filter Bar
// ============================================================================

const FilterChipBar = ({
  filterMonth,
  setFilterMonth
}: {
  filterMonth: string
  setFilterMonth: (v: string) => void
}): React.JSX.Element => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const chips = [
    { label: 'Son 30 Gün', value: 'all' },
    ...MONTHS.map((m, i) => ({ label: m, value: i.toString() }))
  ]

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none [-webkit-overflow-scrolling:touch]"
      style={{ scrollbarWidth: 'none' }}
    >
      {chips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => setFilterMonth(chip.value)}
          className={cn(
            'shrink-0 h-8 px-4 rounded-full text-[11px] font-black tracking-wider transition-all duration-200 whitespace-nowrap',
            filterMonth === chip.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted hover:text-foreground'
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Report Grid Cell
// ============================================================================

const ReportGridCell = ({
  date,
  report,
  onClick
}: {
  date: Date
  report: DailySummary | null
  onClick: (r: DailySummary) => void
}): React.JSX.Element => {
  const isToday = new Date().toDateString() === date.toDateString()
  const day = date.getDate()

  return (
    <button
      onClick={() => report && onClick(report)}
      disabled={!report}
      className={cn(
        'group relative flex flex-col items-center justify-between p-2 aspect-square rounded-2xl transition-all duration-300',
        'border-2 border-transparent',
        report
          ? 'bg-background shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 cursor-pointer ring-1 ring-zinc-100 dark:ring-zinc-800'
          : 'bg-muted/10 opacity-40 grayscale cursor-default border-dashed border-zinc-200 dark:border-zinc-800/50'
      )}
    >
      {/* Day Number */}
      <div className="flex items-center justify-between w-full">
        <span
          className={cn(
            'text-[10px] font-black tabular-nums tracking-tighter',
            isToday
              ? 'text-primary'
              : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200'
          )}
        >
          {day}
        </span>
        {report && <div className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />}
      </div>

      {/* Revenue or Placeholder */}
      <div className="flex-1 flex items-center justify-center w-full">
        {report ? (
          <div className="flex flex-col items-center">
            <span className="text-[13px] font-black tabular-nums tracking-tighter text-foreground leading-tight">
              {formatLira(report.totalRevenue)}
            </span>
          </div>
        ) : (
          <div className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        )}
      </div>

      {isToday && !report && (
        <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-primary/20 rounded-full" />
      )}
    </button>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function RecentZReports(): React.JSX.Element {
  const { zReportHistory, filterMonth, setFilterMonth, filterYear, setFilterYear } =
    useDashboardContext()
  const [selectedReport, setSelectedReport] = useState<DailySummary | null>(null)

  // 31 Günlük Veri Setini Hazırla
  const gridData = React.useMemo(() => {
    const year = parseInt(filterYear)
    let dates: Date[] = []

    if (filterMonth === 'all') {
      // Son 30 Gün
      dates = Array.from({ length: 30 }, (_, i) => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        d.setDate(d.getDate() - (29 - i))
        return d
      })
    } else {
      const month = parseInt(filterMonth)
      const dayCount = new Date(year, month + 1, 0).getDate()
      dates = Array.from({ length: dayCount }, (_, i) => {
        return new Date(year, month, i + 1)
      })
    }

    return dates.map((date) => {
      const report = zReportHistory.find((r) => {
        const rDate = new Date(r.date)
        return (
          rDate.getDate() === date.getDate() &&
          rDate.getMonth() === date.getMonth() &&
          rDate.getFullYear() === date.getFullYear()
        )
      })
      return { date, report: report || null }
    })
  }, [zReportHistory, filterMonth, filterYear])

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[1000ms] fill-mode-both">
        <div className="bg-card border-2 border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm text-foreground overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-border/50 bg-muted/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground tracking-tight">
                  Z-Raporu Geçmişi
                </h3>
                <p className="text-[11px] text-muted-foreground font-black tracking-widest uppercase opacity-70">
                  {filterMonth === 'all'
                    ? 'SON 30 GÜN'
                    : `${MONTH_OPTIONS_TR[parseInt(filterMonth)]} ${filterYear}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end mr-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1 opacity-50">
                  YIL
                </span>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="h-8 w-20 bg-muted/40 border-none shadow-none text-[12px] font-black rounded-xl hover:bg-muted/60 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2">
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem key={y} value={y} className="text-[12px] font-black">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Filter chip bar */}
          <div className="px-8 pt-6">
            <FilterChipBar filterMonth={filterMonth} setFilterMonth={setFilterMonth} />
          </div>

          {/* Grid View: Fixed territory for exactly 31 items */}
          <div className="px-8 pb-8">
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 gap-2.5 min-h-[380px]">
              {gridData.map(({ date, report }) => (
                <ReportGridCell
                  key={date.toISOString()}
                  date={date}
                  report={report}
                  onClick={setSelectedReport}
                />
              ))}

              {/* Pad with empty disabled slots to maintain "Fixed Territory" if month has < 31 days */}
              {gridData.length < 31 &&
                Array.from({ length: 31 - gridData.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="bg-zinc-50/20 dark:bg-zinc-900/10 rounded-2xl aspect-square border border-zinc-100/30 dark:border-zinc-800/10"
                  />
                ))}
            </div>

            {gridData.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground/30">
                <History className="w-12 h-12 opacity-20" />
                <span className="text-[11px] font-black tracking-[0.2em] uppercase">
                  Rapor Bulunamadı
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportDetailDialog report={selectedReport} onClose={() => setSelectedReport(null)} />
    </>
  )
}

const MONTH_OPTIONS_TR = MONTHS.map((m) => m.toLocaleUpperCase('tr-TR'))
