import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Calendar, ChevronLeft, ChevronRight, History, RefreshCw } from 'lucide-react'
import { cafeApi, type Order } from '@/lib/api'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export function OrderHistoryModal(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  const LIMIT = 15

  const loadOrders = useCallback(
    async (dateOverride?: string): Promise<void> => {
      setLoading(true)
      try {
        const result = await cafeApi.orderHistory.get({
          date: dateOverride || dateFilter,
          limit: LIMIT,
          offset: page * LIMIT
        })
        setOrders(result.orders)
        setTotalCount(result.totalCount)
      } catch (error) {
        console.error('Failed to load order history:', error)
      } finally {
        setLoading(false)
      }
    },
    [dateFilter, page]
  )

  // Reset date when modal opens
  useEffect(() => {
    if (open) {
      // Use local date instead of UTC to fix timezone issues
      const today = format(new Date(), 'yyyy-MM-dd')
      setDateFilter(today)
    }
  }, [open])

  // Load orders when filters change or modal opens
  useEffect(() => {
    if (open) {
      loadOrders()
    }
  }, [open, loadOrders, dateFilter, page])

  const toggleExpand = (orderId: string): void => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <History className="w-4 h-4" />
          Sipariş Geçmişi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[96vw] max-w-[96vw] w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Sipariş Geçmişi
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar - Compact Single Row */}
        <div className="flex items-center gap-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value)
                setPage(0)
              }}
              className="w-[160px]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadOrders()}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <div className="ml-auto text-sm text-muted-foreground">
            Toplam <strong className="text-foreground">{totalCount}</strong> sipariş
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto min-h-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Saat</TableHead>
                <TableHead className="w-[150px]">Masa</TableHead>
                <TableHead className="w-[150px]">Tutar</TableHead>
                <TableHead>Özet</TableHead>
                <TableHead className="w-[120px]">Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Yükleniyor...</p>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Bu tarihte kayıtlı sipariş yok.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <>
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <TableCell className="font-medium">
                        {format(new Date(order.createdAt), 'HH:mm', { locale: tr })}
                      </TableCell>
                      <TableCell>{order.table?.name || 'Bilinmeyen'}</TableCell>
                      <TableCell className="font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {order.items?.map((i) => i.product?.name).join(', ')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          Tamamlandı
                        </Badge>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details - Clean Two Column Layout */}
                    {expandedOrderId === order.id && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={5} className="p-4">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold mb-2">Sipariş Detayı</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left Column - Items */}
                              <div className="space-y-2">
                                {order.items?.map((item) => (
                                  <div key={item.id} className="flex justify-between text-sm">
                                    <span>
                                      {item.quantity}x {item.product?.name}
                                    </span>
                                    <span className="tabular-nums">
                                      {formatCurrency(item.unitPrice * item.quantity)}
                                    </span>
                                  </div>
                                ))}
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                                  <span>Toplam</span>
                                  <span className="tabular-nums">
                                    {formatCurrency(order.totalAmount)}
                                  </span>
                                </div>
                              </div>

                              {/* Right Column - Info */}
                              <div className="text-sm text-muted-foreground border-l pl-6">
                                <p>
                                  Sipariş ID:{' '}
                                  <span className="font-mono text-xs">
                                    {order.id.slice(0, 16)}...
                                  </span>
                                </p>
                                <p>
                                  Tarih:{' '}
                                  {format(new Date(order.createdAt), 'dd MMMM yyyy HH:mm', {
                                    locale: tr
                                  })}
                                </p>
                                {order.payments && order.payments.length > 0 && (
                                  <div className="mt-3">
                                    <p className="font-semibold text-foreground">Ödeme Bilgisi:</p>
                                    {order.payments.map((p) => (
                                      <div key={p.id} className="flex justify-between mt-1">
                                        <span>
                                          {p.paymentMethod === 'CASH' ? 'Nakit' : 'Kredi Kartı'}
                                        </span>
                                        <span className="tabular-nums">
                                          {formatCurrency(p.amount)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between py-3 border-t mt-auto">
          <span className="text-sm text-muted-foreground">
            Sayfa {page + 1} / {Math.max(1, Math.ceil(totalCount / LIMIT))}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={orders.length < LIMIT || loading}
            >
              Sonraki
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
