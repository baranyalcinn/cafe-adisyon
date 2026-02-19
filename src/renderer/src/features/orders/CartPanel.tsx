import { PremiumAmount } from '@/components/PremiumAmount'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { QuantitySelector } from '@/components/ui/QuantitySelector'
import { useSound } from '@/hooks/useSound'
import { Order } from '@/lib/api'
import { soundManager } from '@/lib/sound'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Banknote,
  CheckCircle,
  History as HistoryIcon,
  Lock,
  LockOpen,
  Receipt,
  ShoppingBag,
  Trash2,
  Wallet
} from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

interface CartPanelProps {
  order: Order | null | undefined
  isLocked: boolean
  onPaymentClick: (amount: number) => void
  onUpdateItem: (orderItemId: string, quantity: number) => void
  onRemoveItem: (orderItemId: string) => void
  onToggleLock: () => void
  onDeleteOrder: (orderId: string) => void
}

export const CartPanel = React.memo(function CartPanel({
  order,
  isLocked,
  onPaymentClick,
  onUpdateItem,
  onRemoveItem,
  onToggleLock,
  onDeleteOrder
}: CartPanelProps): React.JSX.Element {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const { playAdd, playRemove, playClick } = useSound()

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = debounceTimers.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  // Memoize sorted items to prevent re-sorting on every render frame
  const items = order?.items
  // Process items: Group paid items by productId, keep unpaid separate
  const processedItems = useMemo(() => {
    if (!items) return []

    const unpaid = items.filter((i) => !i.isPaid)
    const paid = items.filter((i) => i.isPaid)

    // Aggregate paid items
    const aggregatedPaidMap = new Map<string, (typeof items)[0]>()
    paid.forEach((item) => {
      const existing = aggregatedPaidMap.get(item.productId)
      if (existing) {
        aggregatedPaidMap.set(item.productId, {
          ...existing,
          quantity: existing.quantity + item.quantity
        })
      } else {
        aggregatedPaidMap.set(item.productId, { ...item })
      }
    })

    const aggregatedPaid = Array.from(aggregatedPaidMap.values())

    // Return unpaid first, then aggregated paid
    return [...unpaid, ...aggregatedPaid]
  }, [items])

  // Calculate totals from order data
  const total = order?.totalAmount || 0
  const paidAmount = order?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remainingAmount = total - paidAmount

  // Enter key to confirm delete dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (showDeleteDialog && e.key === 'Enter') {
        e.preventDefault()
        if (order) {
          onDeleteOrder(order.id)
          setShowDeleteDialog(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDeleteDialog, order, onDeleteOrder])

  const handleUpdateQuantity = (
    orderItemId: string,
    productId: string,
    newQuantity: number
  ): void => {
    if (isLocked) {
      soundManager.playError()
      return
    }

    const item = order?.items?.find((i) => i.id === orderItemId)
    if (item?.isPaid) {
      soundManager.playError()
      return
    }

    // Determine if it's an increment or decrement for sound feedback
    const currentQuantity = item?.quantity || 0
    if (newQuantity > currentQuantity) {
      playAdd()
    } else {
      playRemove()
    }

    // Clear existing timer for this product
    const existingTimer = debounceTimers.current.get(productId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    if (newQuantity <= 0) {
      const unpaidItems = order?.items?.filter((i) => !i.isPaid) || []
      const isLastUnpaidItem = unpaidItems.length === 1 && unpaidItems[0].id === orderItemId
      if (isLastUnpaidItem) {
        setShowDeleteDialog(true)
      } else {
        onRemoveItem(orderItemId)
      }
    } else {
      const timer = setTimeout(() => {
        onUpdateItem(orderItemId, newQuantity)
        debounceTimers.current.delete(productId)
      }, 300)
      debounceTimers.current.set(productId, timer)
    }
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (order) {
      onDeleteOrder(order.id)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="w-96 bg-background border-l border-border flex flex-col h-full animate-in slide-in-from-right duration-700 relative overflow-hidden shadow-2xl gpu-accelerated">
      {/* Premium Header */}

      <div className="shrink-0 h-14 px-6 border-b border-border bg-background z-20 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-base font-black tracking-tight flex items-center gap-3 text-foreground">
            Adisyon
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary tracking-[0.2em] border border-primary/20 uppercase">
              {order?.items?.length || 0} ÜRÜN
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleLock}
            className={cn(
              'h-8 w-8 rounded-lg transition-all duration-300',
              isLocked
                ? 'text-amber-500 bg-amber-500/15 border border-amber-500/20 shadow-sm'
                : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/60'
            )}
            title={isLocked ? 'Masayı Aç' : 'Masayı Kilitle'}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 rounded-lg transition-all duration-300',
              !order?.items?.length
                ? 'opacity-0 pointer-events-none'
                : 'text-muted-foreground/70 hover:text-destructive hover:bg-destructive/15 hover:border-destructive/20'
            )}
            onClick={() => setShowDeleteDialog(true)}
            disabled={!order?.items || order.items.length === 0}
            title="Masayı Boşalt"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative z-10 flex flex-col">
        {processedItems.length > 0 ? (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            <div className="p-4 flex flex-col min-h-min space-y-2">
              {/* Unpaid Items Group */}
              <div className="space-y-1">
                {processedItems
                  .filter((i) => !i.isPaid)
                  .map((item) => {
                    const productName = item.product?.name || 'Yeni Ürün'
                    return (
                      <div
                        key={item.id}
                        className="relative origin-top flex items-center justify-between gap-3 p-1.5 px-3 group/item rounded-xl border transition-all duration-300 bg-card/40 border-border/5 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 active:scale-[0.99] animate-in fade-in slide-in-from-right-2 duration-500"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.quantity > 1 && (
                            <span className="shrink-0 text-[14px] font-black text-rose-500 tabular-nums">
                              {item.quantity}x
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[13px] text-foreground tracking-tight break-words leading-tight">
                              {productName.replace(/([a-z])([A-Z])/g, '$1 $2')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <p className="text-[14px] font-black tabular-nums text-foreground/90 whitespace-nowrap">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                          <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <QuantitySelector
                              quantity={item.quantity}
                              onUpdate={(newQty) =>
                                handleUpdateQuantity(item.id, item.productId, newQty)
                              }
                              isLocked={isLocked}
                              showNumber={false}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Paid Items Group (Archived look) */}
              {processedItems.some((i) => i.isPaid) && (
                <div className="mt-8 pt-6 border-t border-dashed border-border/40">
                  <div className="flex items-center gap-2 mb-4 px-1 text-muted-foreground/70">
                    <HistoryIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">
                      ÖDENMİŞ KALEMLER
                    </span>
                  </div>
                  <div className="space-y-1">
                    {processedItems
                      .filter((i) => i.isPaid)
                      .map((item) => {
                        const productName = item.product?.name || 'Yeni Ürün'
                        return (
                          <div
                            key={`${item.productId}-paid-group`}
                            className="relative flex items-center justify-between gap-3 p-1.5 px-3 rounded-xl bg-muted/5 border border-border/10 opacity-90 group/paid transition-all hover:opacity-100"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {item.quantity > 1 && (
                                <span className="text-[13px] font-black text-rose-500/80 tabular-nums shrink-0">
                                  {item.quantity}x
                                </span>
                              )}
                              <p className="font-bold text-[13px] text-foreground/85 tracking-tight break-words leading-tight">
                                {productName}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <p className="text-[12px] font-black tabular-nums text-foreground/60">
                                {formatCurrency(item.unitPrice * item.quantity)}
                              </p>
                              <div className="p-1 rounded-full bg-emerald-500/5 text-emerald-500/70">
                                <CheckCircle className="w-3 h-3" />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6 group-hover/panel:scale-110 transition-transform duration-500">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-black text-muted-foreground/60 mb-2">Adisyon Boş</h3>
            <p className="text-sm text-muted-foreground/60 max-w-[200px] leading-relaxed">
              Siparişe ürün eklemek için soldaki menüyü kullanın.
            </p>
          </div>
        )}
      </div>
      {/* Footer - Premium Glassmorphic Simplified */}
      <div className="shrink-0 p-6 bg-background/80 backdrop-blur-xl border-t border-border/10 z-20 rounded-t-[2.5rem] shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.4)]">
        <div className="space-y-5">
          <div className="space-y-3 px-1">
            <div className="flex justify-between items-center text-[13px]">
              <div className="flex items-center gap-2.5 text-muted-foreground/80 font-bold uppercase tracking-tight">
                <Receipt className="w-3.5 h-3.5" />
                Ara Toplam
              </div>
              <span className="text-foreground/90 font-black tabular-nums tracking-tight">
                {formatCurrency(total)}
              </span>
            </div>

            {paidAmount > 0 && (
              <div className="flex justify-between items-center text-[13px]">
                <div className="flex items-center gap-2.5 text-emerald-600/80 dark:text-emerald-400/80 font-bold uppercase tracking-tight">
                  <Wallet className="w-3.5 h-3.5" />
                  Ödenen
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-black tabular-nums tracking-tight">
                  -{formatCurrency(paidAmount)}
                </span>
              </div>
            )}
          </div>

          <div className="h-px bg-border/10 w-full" />

          <div className="flex justify-between items-end gap-4 px-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-muted-foreground/90 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary" />
                Ödenecek Tutar
              </span>
              <PremiumAmount amount={remainingAmount} size="2xl" fontWeight="black" />
            </div>

            <Button
              size="lg"
              className="h-12 px-7 text-base font-black rounded-2xl shadow-xl shadow-primary/20 bg-primary text-primary-foreground active:scale-95 transition-all shrink-0"
              onClick={() => {
                playClick()
                onPaymentClick(remainingAmount)
              }}
              disabled={remainingAmount <= 0}
            >
              <Banknote className="w-4 h-4 mr-2" />
              ÖDEME AL
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none bg-transparent shadow-none">
          <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center mx-auto rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-inner">
                <Trash2 className="w-10 h-10 text-destructive" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-foreground">
                  Adisyonu Sil?
                </h3>
                <p className="text-muted-foreground/70 leading-relaxed font-medium">
                  Bu işlem adisyondaki tüm ürünleri silecek ve masayı boşaltacaktır. Emin misiniz?
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    playClick()
                    setShowDeleteDialog(false)
                  }}
                  className="flex-1 h-12 rounded-2xl font-bold border-border/50 hover:bg-muted/50"
                >
                  Vazgeç
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    playRemove()
                    handleConfirmDelete()
                  }}
                  className="flex-1 h-12 rounded-2xl font-black tracking-wider shadow-lg shadow-destructive/20 active:scale-95"
                >
                  Evet, Sil
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})
