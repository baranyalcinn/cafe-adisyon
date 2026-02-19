import { PremiumAmount } from '@/components/PremiumAmount'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { QuantitySelector } from '@/components/ui/QuantitySelector'
import { useSound } from '@/hooks/useSound'
import { Order } from '@/lib/api'
import { soundManager } from '@/lib/sound'
import { cn, formatCurrency } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle,
  History as HistoryIcon,
  Lock,
  LockOpen,
  ShoppingBag,
  Trash2
} from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

interface CartPanelProps {
  order: Order | null | undefined
  isLocked: boolean
  onPaymentClick: () => void
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
                : 'text-muted-foreground/40 hover:text-foreground hover:bg-muted/60'
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
                : 'text-muted-foreground/40 hover:text-destructive hover:bg-destructive/15 hover:border-destructive/20'
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
              <AnimatePresence initial={false}>
                {processedItems
                  .filter((i) => !i.isPaid)
                  .map((item) => {
                    const productName = item.product?.name || 'Yeni Ürün'
                    return (
                      <div
                        key={item.id}
                        className="relative origin-top flex items-center justify-between gap-x-2 px-3 pl-4.5 group/item rounded-lg border shadow-sm transform-gpu cursor-pointer select-none transition-all duration-300 bg-muted/20 border-border/40 hover:bg-muted/40 hover:border-border/60 active:scale-[0.98]"
                      >
                        <div className="w-full flex items-center justify-between py-1">
                          <div className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover/item:w-1.5 bg-primary/40" />

                          <div className="flex items-baseline gap-2 flex-1 min-w-0">
                            <div className="shrink-0 flex justify-start min-w-[1.4rem]">
                              <AnimatePresence mode="wait">
                                {item.quantity > 1 && (
                                  <motion.span
                                    key={`qty-${item.quantity}`}
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="text-[14px] font-bold text-rose-500 tabular-nums inline-block"
                                  >
                                    x{item.quantity}
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                            <p className="font-bold text-[15px] tracking-tight leading-snug break-words line-clamp-2 transition-all duration-500 text-foreground/90">
                              {productName.replace(/([a-z])([A-Z])/g, '$1 $2')}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 ml-2">
                            <p className="text-[14px] font-black tabular-nums transition-all duration-500 text-foreground">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </p>

                            <QuantitySelector
                              quantity={item.quantity}
                              onUpdate={(newQty) =>
                                handleUpdateQuantity(item.id, item.productId, newQty)
                              }
                              isLocked={isLocked}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </AnimatePresence>

              {/* Paid Items Group (Archived look) */}
              {processedItems.some((i) => i.isPaid) && (
                <div className="mt-8 pt-6 border-t border-dashed border-border/60">
                  <div className="flex items-center gap-2 mb-4 px-1 text-muted-foreground/40">
                    <HistoryIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">
                      ÖDENMİŞ KALEMLER
                    </span>
                  </div>
                  <AnimatePresence>
                    {processedItems
                      .filter((i) => i.isPaid)
                      .map((item) => {
                        const productName = item.product?.name || 'Yeni Ürün'
                        return (
                          <div
                            key={`${item.productId}-paid-group`}
                            className="relative origin-top flex items-center justify-between gap-x-2 px-3 pl-4.5 group/item rounded-lg border shadow-none mb-2 transform-gpu cursor-default select-none transition-all duration-500 ease-out bg-muted/5 border-border/10 opacity-40 scale-[0.98] hover:opacity-100 hover:scale-100 hover:bg-muted/10 hover:border-border/20 animate-in fade-in duration-300"
                          >
                            <div className="w-full flex items-center justify-between py-1">
                              <div className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover/item:w-1.5 bg-success/20" />

                              <div className="flex items-baseline gap-2 flex-1 min-w-0">
                                <div className="shrink-0 flex justify-start min-w-[1.4rem]">
                                  {item.quantity > 1 && (
                                    <span className="text-[14px] font-bold text-rose-500/60 tabular-nums inline-block">
                                      x{item.quantity}
                                    </span>
                                  )}
                                </div>
                                <p className="font-bold text-[15px] tracking-tight leading-snug break-words line-clamp-2 transition-all duration-500 text-muted-foreground/40">
                                  {productName.replace(/([a-z])([A-Z])/g, '$1 $2')}
                                </p>
                              </div>

                              <div className="flex items-center gap-4 ml-2">
                                <p className="text-[14px] font-black tabular-nums transition-all duration-500 text-muted-foreground/30">
                                  {formatCurrency(item.unitPrice * item.quantity)}
                                </p>

                                <div className="px-2.5 py-1 bg-success/5 rounded-lg border border-border/10 flex items-center gap-1.5 shadow-none transition-all duration-500 group-hover/item:bg-success/10">
                                  <CheckCircle className="w-3 h-3 text-success/50" />
                                  <span className="text-[10px] font-black text-success/60 tracking-[0.2em] uppercase">
                                    ÖDENDİ
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6 group-hover/panel:scale-110 transition-transform duration-500">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/20" />
            </div>
            <h3 className="text-lg font-black text-muted-foreground/60 mb-2">Adisyon Boş</h3>
            <p className="text-sm text-muted-foreground/30 max-w-[200px] leading-relaxed">
              Siparişe ürün eklemek için soldaki menüyü kullanın.
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 p-6 bg-background border-t border-border z-20 space-y-5">
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[13px] font-bold text-muted-foreground/60 tracking-[0.1em] uppercase">
              Ara Toplam
            </span>
            <PremiumAmount amount={total} size="md" color="foreground" fontWeight="bold" />
          </div>

          {paidAmount > 0 && (
            <div className="flex justify-between items-center px-1 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <span className="text-[13px] font-bold text-success/60 tracking-[0.1em] uppercase">
                Ödenen
              </span>
              <PremiumAmount amount={-paidAmount} size="md" color="success" fontWeight="bold" />
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-end px-1 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground/40 tracking-[0.2em] mb-1.5 uppercase">
                  ÖDENECEK TUTAR
                </span>
                <PremiumAmount amount={remainingAmount} size="2xl" fontWeight="black" />
              </div>
              <Button
                onClick={() => {
                  playClick()
                  onPaymentClick()
                }}
                disabled={remainingAmount <= 0}
                className={cn(
                  'h-14 px-10 rounded-2xl font-black text-xs tracking-[0.2em] uppercase transition-all duration-300 active:scale-95 flex-1 max-w-[200px]',
                  remainingAmount <= 0
                    ? 'bg-muted text-muted-foreground/30 cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-lg shadow-primary/10'
                )}
              >
                ÖDEME AL
              </Button>
            </div>
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
