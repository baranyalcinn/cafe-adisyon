import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
import { formatCurrency } from '@/lib/utils'
import { Banknote, Calendar, ChevronRight, CreditCard, History, ReceiptText } from 'lucide-react'
import React, { useState } from 'react'
import { useDashboardContext } from '../context/DashboardContext'

export function RecentZReports(): React.JSX.Element {
  const { zReportHistory, filterMonth, setFilterMonth, filterYear, setFilterYear } =
    useDashboardContext()
  const [selectedReport, setSelectedReport] = useState<DailySummary | null>(null)

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[1000ms] fill-mode-both">
        <div className="bg-card border border-border/50 rounded-[2rem] p-8 shadow-sm text-foreground">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <History className="w-6 h-6 text-foreground/70 drop-shadow-sm" />
              <div>
                <h3 className="text-xl font-black text-foreground">Z-Raporu Geçmişi</h3>
                <p className="text-sm text-muted-foreground/60 font-medium">
                  Önceki gün sonu özetleri
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-9 w-24 bg-background border-border/50 text-[10px] font-black uppercase tracking-widest rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024" className="text-[11px] font-bold">
                    2024
                  </SelectItem>
                  <SelectItem value="2025" className="text-[11px] font-bold">
                    2025
                  </SelectItem>
                  <SelectItem value="2026" className="text-[11px] font-bold">
                    2026
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-9 w-32 bg-background border-border/50 text-[10px] font-black uppercase tracking-widest rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[11px] font-bold">
                    SON 30 GÜN
                  </SelectItem>
                  {[
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
                  ].map((m, i) => (
                    <SelectItem key={m} value={i.toString()} className="text-[11px] font-bold">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-3xl border border-border/40 overflow-hidden bg-background">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="pl-6 h-12 text-[10px] font-black text-muted-foreground/60 tracking-widest">
                    TARİH
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black text-muted-foreground/60 tracking-widest">
                    NAKİT
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black text-muted-foreground/60 tracking-widest">
                    KART
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black text-foreground tracking-widest">
                    TOPLAM
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black text-muted-foreground/60 tracking-widest pr-10">
                    SİPARİŞ
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zReportHistory.map((report) => (
                  <TableRow
                    key={report.id}
                    className="border-border/50 hover:bg-muted/10 cursor-pointer h-16 group"
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

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border bg-card shadow-2xl rounded-[2.5rem] [&>button]:hidden">
          {selectedReport && (
            <div className="flex flex-col">
              <div className="px-10 py-8 border-b bg-muted/10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Rapor Detayı</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mt-1">
                    <Calendar className="w-4 h-4 opacity-50" />
                    <span>
                      {new Date(selectedReport.date).toLocaleDateString('tr-TR', {
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
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-3xl border border-border bg-background shadow-sm space-y-1">
                    <span className="text-[10px] font-black text-muted-foreground/40 tracking-widest uppercase">
                      GÜNLÜK HASILAT
                    </span>
                    <div className="text-2xl font-black tabular-nums">
                      {formatCurrency(selectedReport.totalRevenue)}
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl border border-border bg-background shadow-sm space-y-1">
                    <span className="text-[10px] font-black text-muted-foreground/40 tracking-widest uppercase">
                      TOPLAM SİPARİŞ
                    </span>
                    <div className="text-2xl font-black tabular-nums">
                      {selectedReport.orderCount} ADET
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-muted-foreground/40 tracking-[0.2em] uppercase px-1">
                    Ödeme Kanalları
                  </h4>
                  <div className="border border-border rounded-3xl overflow-hidden divide-y divide-border">
                    <div className="flex justify-between items-center p-5 bg-background hover:bg-muted/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-success/5 flex items-center justify-center">
                          <Banknote className="w-5 h-5 text-success" />
                        </div>
                        <span className="font-bold text-sm">NAKİT ÖDEMELER</span>
                      </div>
                      <span className="font-black tabular-nums text-success">
                        {formatCurrency(selectedReport.totalCash)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-5 bg-background hover:bg-muted/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-info/5 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-info" />
                        </div>
                        <span className="font-bold text-sm">KART ÖDEMELERİ</span>
                      </div>
                      <span className="font-black tabular-nums text-info">
                        {formatCurrency(selectedReport.totalCard)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => setSelectedReport(null)}
                    className="w-full h-14 rounded-2xl font-black text-xs tracking-widest uppercase bg-muted text-foreground hover:bg-muted/80"
                  >
                    KAPAT
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
