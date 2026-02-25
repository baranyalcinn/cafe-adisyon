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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { DailySummary } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Banknote, Calendar, ChevronRight, CreditCard, History, ReceiptText } from 'lucide-react'
import React, { useState } from 'react'
import { useDashboardContext } from '../context/DashboardContext'

// ============================================================================
// Constants & Styles
// ============================================================================

const MONTHS = [
  'OCAK',
  'ŞUBAT',
  'MART',
  'NİSAN',
  'MAYIS',
  'HAZİRAN',
  'TEMMUZ',
  'AĞUSTOS',
  'EYLÜL',
  'EKİM',
  'KASIM',
  'ARALIK'
]

const START_YEAR = 2025
const CURRENT_YEAR = new Date().getFullYear()

const YEAR_OPTIONS = Array.from({ length: Math.max(1, CURRENT_YEAR - START_YEAR + 1) }, (_, i) =>
  (START_YEAR + i).toString()
).reverse()

const STYLES = {
  container: 'animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[1000ms] fill-mode-both',
  card: 'bg-card border border-border/50 rounded-[2rem] p-8 shadow-sm text-foreground',
  headerBox: 'flex items-center justify-between mb-10',
  title: 'text-xl font-black text-foreground',
  subtitle: 'text-sm text-muted-foreground/60 font-medium',

  selectTrigger:
    'h-9 bg-background border-border/50 text-[10px] font-black tracking-widest rounded-xl',

  tableWrapper: 'rounded-3xl border border-border/40 overflow-hidden bg-background',
  tableHead: 'text-[10px] font-black text-muted-foreground/60 tracking-widest',
  tableRow: 'border-border/50 hover:bg-muted/10 cursor-pointer h-16 group',

  dialogContent:
    'sm:max-w-[500px] p-0 overflow-hidden border-border bg-card shadow-2xl rounded-[2.5rem] [&>button]:hidden',
  dialogHeader: 'px-10 py-8 border-b bg-muted/10 flex items-center justify-between',
  statBox: 'p-6 rounded-3xl border border-border bg-background shadow-sm space-y-1',
  paymentRow:
    'flex justify-between items-center p-5 bg-background hover:bg-muted/5 transition-colors'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

/** * Rapor Detay Modal'ı */
const ReportDetailDialog = ({
  report,
  onClose
}: {
  report: DailySummary | null
  onClose: () => void
}): React.JSX.Element => (
  <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className={STYLES.dialogContent} aria-describedby={undefined}>
      <VisuallyHidden.Root asChild>
        <DialogTitle>Rapor Detayı</DialogTitle>
      </VisuallyHidden.Root>

      {report && (
        <div className="flex flex-col">
          {/* Header */}
          <div className={STYLES.dialogHeader}>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Rapor Detayı</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mt-1">
                <Calendar className="w-4 h-4 opacity-50" />
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
            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <ReceiptText className="w-7 h-7 text-primary" />
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className={STYLES.statBox}>
                <span className="text-[10px] font-black text-muted-foreground/40 tracking-widest uppercase">
                  GÜNLÜK HASILAT
                </span>
                <div className="text-2xl font-black tabular-nums">
                  {formatCurrency(report.totalRevenue)}
                </div>
              </div>
              <div className={STYLES.statBox}>
                <span className="text-[10px] font-black text-muted-foreground/40 tracking-widest uppercase">
                  TOPLAM SİPARİŞ
                </span>
                <div className="text-2xl font-black tabular-nums">{report.orderCount} ADET</div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-muted-foreground/40 tracking-[0.2em] px-1 uppercase">
                Ödeme Kanalları
              </h4>
              <div className="border border-border rounded-3xl overflow-hidden divide-y divide-border">
                <div className={STYLES.paymentRow}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-success/5 flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-success" />
                    </div>
                    <span className="font-bold text-sm">NAKİT ÖDEMELER</span>
                  </div>
                  <span className="font-black tabular-nums text-success">
                    {formatCurrency(report.totalCash)}
                  </span>
                </div>
                <div className={STYLES.paymentRow}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-info/5 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-info" />
                    </div>
                    <span className="font-bold text-sm">KART ÖDEMELERİ</span>
                  </div>
                  <span className="font-black tabular-nums text-info">
                    {formatCurrency(report.totalCard)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="pt-4">
              <Button
                onClick={onClose}
                className="w-full h-14 rounded-2xl font-black text-xs tracking-widest bg-muted text-foreground hover:bg-muted/80 uppercase"
              >
                KAPAT
              </Button>
            </div>
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
)

// ============================================================================
// Main Component
// ============================================================================

export function RecentZReports(): React.JSX.Element {
  const { zReportHistory, filterMonth, setFilterMonth, filterYear, setFilterYear } =
    useDashboardContext()
  const [selectedReport, setSelectedReport] = useState<DailySummary | null>(null)

  return (
    <>
      <div className={STYLES.container}>
        <div className={STYLES.card}>
          {/* Header & Filters */}
          <div className={STYLES.headerBox}>
            <div className="flex items-center gap-4">
              <History className="w-6 h-6 text-foreground/70 drop-shadow-sm" />
              <div>
                <h3 className={STYLES.title}>Z-Raporu Geçmişi</h3>
                <p className={STYLES.subtitle}>Önceki gün sonu özetleri</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className={cn(STYLES.selectTrigger, 'w-24')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={y} className="text-[11px] font-bold">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className={cn(STYLES.selectTrigger, 'w-32')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[11px] font-bold">
                    SON 30 GÜN
                  </SelectItem>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={i.toString()} className="text-[11px] font-bold">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Table */}
          <div className={STYLES.tableWrapper}>
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className={cn(STYLES.tableHead, 'pl-6 h-12')}>TARİH</TableHead>
                  <TableHead className={cn(STYLES.tableHead, 'text-right')}>NAKİT</TableHead>
                  <TableHead className={cn(STYLES.tableHead, 'text-right')}>KART</TableHead>
                  <TableHead className="text-right text-[10px] font-black text-foreground tracking-widest">
                    TOPLAM
                  </TableHead>
                  <TableHead className={cn(STYLES.tableHead, 'text-right pr-10')}>
                    SİPARİŞ
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zReportHistory.map((report) => (
                  <TableRow
                    key={report.id}
                    className={STYLES.tableRow}
                    onClick={() => setSelectedReport(report)}
                  >
                    <TableCell className="pl-6 font-bold text-sm text-foreground/80">
                      {new Date(report.date).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-success/70">
                      {formatCurrency(report.totalCash)}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-info/70">
                      {formatCurrency(report.totalCard)}
                    </TableCell>
                    <TableCell className="text-right font-black tabular-nums text-foreground">
                      {formatCurrency(report.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-muted-foreground/60 pr-10">
                      <div className="flex items-center justify-end gap-3">
                        {report.orderCount}
                        <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {zReportHistory.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-40 text-center text-muted-foreground/40 italic text-sm"
                    >
                      Kayıtlı Z-Raporu bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ReportDetailDialog report={selectedReport} onClose={() => setSelectedReport(null)} />
    </>
  )
}
