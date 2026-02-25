'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cafeApi } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils' // cn importu eklendi
import type { Order } from '@shared/types'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, History, Info, RefreshCw } from 'lucide-react'
import React, { memo, useCallback, useEffect, useState } from 'react'

// ============================================================================
// Constants & Styles
// ============================================================================

const LIMIT = 15

const STYLES = {
  modalContent: 'sm:max-w-[96vw] max-w-[96vw] w-full max-h-[90vh] flex flex-col',
  toolbar: 'flex items-center gap-4 py-3 border-b',
  tableWrapper: 'flex-1 overflow-auto min-h-0',
  expandedRow: 'bg-muted/30 hover:bg-muted/30 transition-colors',
  detailsGrid: 'grid grid-cols-1 md:grid-cols-2 gap-6',
  pagination: 'flex items-center justify-between py-3 border-t mt-auto',
  badgeCompleted: 'bg-emerald-50 text-emerald-700 border-emerald-200'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

/** Sipariş Detay Paneli */
const OrderDetails = memo(
  ({ order, loading }: { order: Order; loading: boolean }): React.JSX.Element => {
    if (loading) {
      return (
        <div className="py-8 flex justify-center items-center text-muted-foreground gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" /> Yükleniyor...
        </div>
      )
    }

    return (
      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-black tracking-widest uppercase">Sipariş Detayı</h4>
        </div>
        <div className={STYLES.detailsGrid}>
          <div className="space-y-2">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="font-medium">
                  {item.quantity}x {item.product?.name}
                </span>
                <span className="tabular-nums font-bold text-muted-foreground">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-black text-foreground">
              <span>TOPLAM</span>
              <span className="tabular-nums">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground border-l pl-6 space-y-3">
            <p className="font-bold flex justify-between">
              TARİH:
              <span className="text-foreground">
                {format(new Date(order.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}
              </span>
            </p>
            {order.payments && order.payments.length > 0 && (
              <div className="bg-background/50 p-3 rounded-lg border border-border/40">
                <p className="font-black text-[10px] tracking-widest mb-2 opacity-60">
                  ÖDEME DAĞILIMI
                </p>
                {order.payments.map((p) => (
                  <div key={p.id} className="flex justify-between mt-1 text-xs">
                    <span className="font-bold">
                      {p.paymentMethod === 'CASH' ? 'NAKİT' : 'KART'}
                    </span>
                    <span className="tabular-nums font-black text-foreground">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)
OrderDetails.displayName = 'OrderDetails'

// ============================================================================
// Main Component
// ============================================================================

export function OrderHistoryModal(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  const loadOrders = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      /** * DÜZELTME: cafeApi muhtemelen ApiResponse.data'yı doğrudan döndürüyor.
       * Bu yüzden result.success kontrolünü kaldırıp doğrudan datayı kullanıyoruz.
       */
      const result = await cafeApi.orders.getHistory({
        date: dateFilter,
        limit: LIMIT,
        offset: page * LIMIT
      })

      // result artık doğrudan { orders, totalCount, hasMore } tipinde kabul ediliyor [cite: 81]
      if (result) {
        // @ts-ignore - Eğer cafeApi ApiResponse döndürüyorsa .data ekleyin, döndürmüyorsa kalsın
        const data = result.data || result
        setOrders(data.orders)
        setTotalCount(data.totalCount)
      }
    } catch (error) {
      console.error('OrderHistoryModal.loadOrders', error)
    } finally {
      setLoading(false)
    }
  }, [dateFilter, page])

  useEffect(() => {
    if (open) loadOrders()
  }, [open, loadOrders])

  const toggleExpand = async (orderId: string): Promise<void> => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null)
      return
    }

    setExpandedOrderId(orderId)
    const order = orders.find((o) => o.id === orderId)

    if (order && !order.payments) {
      setLoadingDetails(orderId)
      try {
        const result = await cafeApi.orders.getDetails(orderId)
        // @ts-ignore...
        const data = result.data || result
        if (data) {
          setOrders((prev) => prev.map((o) => (o.id === orderId ? data : o)))
        }
      } finally {
        setLoadingDetails(null)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 font-bold">
          <History className="w-4 h-4" /> Sipariş Geçmişi
        </Button>
      </DialogTrigger>

      <DialogContent className={STYLES.modalContent} aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Sipariş Geçmişi
          </DialogTitle>
        </DialogHeader>

        <div className={STYLES.toolbar}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFilter}
              className="w-[160px] font-bold"
              onChange={(e) => {
                setDateFilter(e.target.value)
                setPage(0)
              }}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadOrders()}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Yenile
          </Button>
          <div className="ml-auto text-xs font-black tracking-widest text-muted-foreground uppercase">
            TOPLAM <span className="text-foreground text-sm ml-1">{totalCount}</span> SİPARİŞ
          </div>
        </div>

        <div className={STYLES.tableWrapper}>
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[100px]">SAAT</TableHead>
                <TableHead className="w-[150px]">MASA</TableHead>
                <TableHead className="w-[150px]">TUTAR</TableHead>
                <TableHead>ÖZET</TableHead>
                <TableHead className="w-[120px]">DURUM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 opacity-50">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                    Bu tarihte kayıtlı sipariş yok.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <React.Fragment key={order.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <TableCell className="font-black">
                        {format(new Date(order.createdAt), 'HH:mm')}
                      </TableCell>
                      <TableCell className="font-bold">{order.table?.name || 'PAKET'}</TableCell>
                      <TableCell className="font-black text-emerald-600 tabular-nums">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground text-xs font-medium">
                        {order.items?.map((i) => i.product?.name).join(', ')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STYLES.badgeCompleted}>
                          TAMAMLANDI
                        </Badge>
                      </TableCell>
                    </TableRow>

                    {expandedOrderId === order.id && (
                      <TableRow className={STYLES.expandedRow}>
                        <TableCell colSpan={5} className="p-6 border-b border-primary/10">
                          <OrderDetails order={order} loading={loadingDetails === order.id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className={STYLES.pagination}>
          <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">
            SAYFA {page + 1} / {Math.max(1, Math.ceil(totalCount / LIMIT))}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-black text-[10px] tracking-widest"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> ÖNCEKİ
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-black text-[10px] tracking-widest"
              onClick={() => setPage((p) => p + 1)}
              disabled={orders.length < LIMIT || loading}
            >
              SONRAKİ <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
