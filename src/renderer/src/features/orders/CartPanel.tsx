import React, { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2, CheckCircle, Lock, LockOpen, ShoppingBag } from 'lucide-react'
import { useSound } from '@/hooks/useSound'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { soundManager } from '@/lib/sound'
import { Order } from '@/lib/api'
import { QuantitySelector } from '@/components/ui/QuantitySelector'

interface CartPanelProps {
  order: Order | null | undefined
  isLocked: boolean
  onPaymentClick: () => void
  onUpdateItem: (orderItemId: string, quantity: number) => void
  onRemoveItem: (orderItemId: string) => void
  onToggleLock: () => void
  onDeleteOrder: (orderId: string) => void
}

export function CartPanel({
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
    <div
      className="w-96 glass-panel cart-panel-accent border-l border-border/30 !border-t-0 flex flex-col h-full animate-in slide-in-from-right duration-700 relative overflow-hidden shadow-2xl"
      style={{ willChange: 'transform' }}
    >
      {/* Premium Glass Effect Background */}

      <div className="shrink-0 h-14 px-5 border-b border-border/10 bg-background/60 backdrop-blur-md z-20 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-base font-black tracking-tight flex items-center gap-3 text-foreground">
            Adisyon
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/15 text-primary uppercase tracking-tighter border border-primary/20">
              {order?.items?.length || 0} Ürün
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
        {order?.items && order.items.length > 0 ? (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            <div className="p-4 flex flex-col min-h-min">
              <>
                {[...order.items]
                  .sort((a, b) => {
                    // Only sort by paid status: unpaid first, paid last
                    return (a.isPaid ? 1 : 0) - (b.isPaid ? 1 : 0)
                  })
                  .map((item) => {
                    const productName = item.product?.name || 'Yeni Ürün'

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'premium-item origin-top overflow-hidden flex flex-wrap items-center justify-between gap-x-2 px-3 pl-4.5 group/item rounded-lg border border-border/40 bg-card/50 shadow-sm mb-2'
                        )}
                      >
                        {/* Inner content wrapper for padding to avoid height animation glitch */}
                        <div className="w-full flex items-center justify-between py-1">
                          <div
                            className={cn(
                              'absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover/item:w-1.5',
                              item.isPaid ? 'bg-success/50' : 'bg-primary/50'
                            )}
                          />

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
                                    className="text-[14px] font-bold text-rose-600 tabular-nums inline-block"
                                  >
                                    x{item.quantity}
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                            <p
                              className={cn(
                                'font-semibold text-[15px] tracking-tight leading-snug break-words line-clamp-2',
                                item.isPaid ? 'text-muted-foreground' : 'text-foreground'
                              )}
                            >
                              {productName.replace(/([a-z])([A-Z])/g, '$1 $2')}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 ml-2">
                            <p className="text-[14px] font-black text-foreground/90 tabular-nums">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </p>

                            {!item.isPaid ? (
                              <QuantitySelector
                                quantity={item.quantity}
                                onUpdate={(newQty) =>
                                  handleUpdateQuantity(item.id, item.productId, newQty)
                                }
                                isLocked={isLocked}
                              />
                            ) : (
                              <div className="px-2.5 py-1 bg-success/15 rounded-lg border border-success/20 flex items-center gap-1.5 shadow-sm">
                                <CheckCircle className="w-3 h-3 text-success animate-in zoom-in duration-300" />
                                <span className="text-[10px] font-black text-success uppercase tracking-tighter">
                                  ÖDENDİ
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-700">
            <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 relative group border border-primary/10">
              <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <ShoppingBag className="w-8 h-8 text-primary/30 group-hover:text-primary/50 transition-colors" />
            </div>
            <h4 className="text-base font-bold text-foreground/70 uppercase tracking-[0.2em]">
              Sepet Boş
            </h4>
            <p className="text-xs text-muted-foreground mt-3 max-w-[220px] leading-relaxed font-medium">
              Masaya sipariş eklemek için menüden seçim yapın.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/10 bg-background/80 backdrop-blur-md relative z-10">
        <div className="flex flex-col gap-3 mb-3">
          <div className="relative group p-6 premium-card ambient-glow overflow-hidden shadow-xl border-primary/5">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl" />

            <div className="relative z-10 flex items-end justify-between">
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-muted-foreground/85 uppercase tracking-widest mb-1.5">
                  {paidAmount > 0 ? 'Ödenecek Kalan' : 'Toplam Tutar'}
                </span>
                <span className="text-[34px] font-black text-foreground tabular-nums tracking-tighter leading-none">
                  {formatCurrency(remainingAmount)}
                </span>
              </div>

              {paidAmount > 0 && (
                <div className="flex flex-col items-end text-right animate-in fade-in slide-in-from-right-2 duration-500">
                  <span className="text-[10px] font-bold text-success/60 uppercase tracking-widest mb-0.5">
                    Ödenen
                  </span>
                  <span className="text-lg font-black text-success tabular-nums leading-none">
                    {formatCurrency(paidAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Button
          className="premium-button h-14 group/pay active:scale-95 transition-all hover:scale-[1.02] shadow-xl shadow-primary/20 hover:shadow-primary/30 border-primary/10"
          disabled={!order?.items || order.items.length === 0 || remainingAmount <= 0}
          onClick={() => {
            playClick()
            onPaymentClick()
          }}
        >
          <span className="relative z-10 uppercase tracking-[0.15em] text-sm font-black">
            Ödeme Al
          </span>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center transition-transform duration-300 group-hover/pay:rotate-6 relative z-10 border border-white/20">
            <CheckCircle className="w-4 h-4" />
          </div>
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-none bg-card/95 backdrop-blur-2xl p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6 border border-destructive/20">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-foreground">
              Masa Boşaltılsın mı?
            </h3>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Masadaki son ürünü siliyorsunuz. Bu işlem masayı tamamen boşaltacak ve adisyonu
              kapatacaktır.
            </p>
          </div>
          <div className="flex gap-3 mt-8">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 h-12 rounded-2xl font-bold"
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="flex-[2] h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-destructive/20"
            >
              Masayı Boşalt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
