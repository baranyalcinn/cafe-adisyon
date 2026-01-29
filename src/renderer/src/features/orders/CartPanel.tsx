import React, { useState, useRef, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2, CheckCircle, Lock, LockOpen, ShoppingBag } from 'lucide-react'
import { useSound } from '@/hooks/useSound'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { soundManager } from '@/lib/sound'
import { Order } from '@/lib/api'
import { QuantitySelector } from '@/components/ui/QuantitySelector'
import { PremiumAmount } from '@/components/PremiumAmount'

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

  // Memoize sorted items to prevent re-sorting on every render frame
  const items = order?.items
  const sortedItems = useMemo(() => {
    if (!items) return []
    return [...items].sort((a, b) => {
      // Only sort by paid status: unpaid first, paid last
      return (a.isPaid ? 1 : 0) - (b.isPaid ? 1 : 0)
    })
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
    <div className="w-96 glass-panel cart-panel-accent border-l border-border/30 !border-t-0 flex flex-col h-full animate-in slide-in-from-right duration-700 relative overflow-hidden shadow-2xl gpu-accelerated">
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
        {sortedItems.length > 0 ? (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            <div className="p-4 flex flex-col min-h-min">
              <AnimatePresence initial={false}>
                {sortedItems.map((item) => {
                  const productName = item.product?.name || 'Yeni Ürün'

                  return (
                    <motion.div
                      layout
                      key={`${item.productId}-${item.isPaid}`}
                      initial={{ opacity: 0, scale: 0.96, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98 }}
                      transition={{
                        layout: { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 },
                        opacity: { duration: 0.3 },
                        scale: { duration: 0.4, type: 'spring', stiffness: 400, damping: 30 },
                        y: { duration: 0.4, type: 'spring', stiffness: 400, damping: 30 }
                      }}
                      style={{
                        willChange: 'transform, opacity',
                        backfaceVisibility: 'hidden',
                        perspective: 1000
                      }}
                      className={cn(
                        'premium-item origin-top flex items-center justify-between gap-x-2 px-3 pl-4.5 group/item rounded-lg border border-border/40 bg-card/50 shadow-sm mb-2 transform-gpu cursor-pointer select-none'
                      )}
                    >
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
                          <p
                            className={cn(
                              'text-[14px] font-black tabular-nums transition-colors duration-300',
                              item.isPaid ? 'text-muted-foreground/40' : 'text-primary'
                            )}
                          >
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
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6 group-hover/panel:scale-110 transition-transform duration-500">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/20" />
            </div>
            <h3 className="text-lg font-bold text-foreground/60 mb-2">Adisyon Boş</h3>
            <p className="text-sm text-muted-foreground/40 max-w-[200px] leading-relaxed">
              Siparişe ürün eklemek için soldaki menüyü kullanın.
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 p-5 bg-background/80 backdrop-blur-xl border-t border-border/15 z-20 space-y-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-semibold text-muted-foreground/70 tracking-tight">
              Ara Toplam
            </span>
            <PremiumAmount amount={total} size="sm" color="foreground" fontWeight="bold" />
          </div>

          {paidAmount > 0 && (
            <div className="flex justify-between items-center px-1 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <span className="text-sm font-semibold text-primary/80 tracking-tight">Ödenen</span>
              <PremiumAmount
                amount={-paidAmount}
                size="sm"
                color="primary"
                fontWeight="extrabold"
              />
            </div>
          )}

          <div className="pt-3 border-t border-border/10">
            <div className="flex justify-between items-end px-1 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">
                  ÖDENECEK TUTAR
                </span>
                <PremiumAmount amount={remainingAmount} size="xl" fontWeight="black" />
              </div>
              <Button
                onClick={() => {
                  playClick()
                  onPaymentClick()
                }}
                disabled={remainingAmount <= 0}
                className={cn(
                  'h-14 px-10 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 active:scale-95 flex-1 max-w-[180px]',
                  remainingAmount <= 0
                    ? 'bg-muted text-muted-foreground/40 cursor-not-allowed border border-border/20 shadow-none'
                    : 'bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.02] shadow-sm'
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
                  className="flex-1 h-12 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-destructive/20 active:scale-95"
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
}
