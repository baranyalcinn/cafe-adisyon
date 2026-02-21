import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Banknote, CheckCircle, CreditCard, Delete, Minus, Plus, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { PremiumAmount } from '@/components/PremiumAmount'
import { Button } from '@/components/ui/button'
import { type Order, type PaymentMethod } from '@/lib/api'
import { soundManager } from '@/lib/sound'
import { cn, formatCurrency } from '@/lib/utils'
import { useTableStore } from '@/store/useTableStore'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  onPaymentComplete?: () => void
  order: Order | null | undefined
  tableName?: string | null
  onProcessPayment: (
    amount: number,
    method: PaymentMethod,
    options?: { skipLog?: boolean }
  ) => Promise<unknown>
  onMarkItemsPaid: (
    items: { id: string; quantity: number }[],
    paymentDetails?: { amount: number; method: PaymentMethod }
  ) => Promise<unknown>
}

type PaymentMode = 'full' | 'items' | 'split'

export function PaymentModal({
  open,
  onClose,
  onPaymentComplete,
  order,
  onProcessPayment,
  onMarkItemsPaid,
  tableName
}: PaymentModalProps): React.JSX.Element {
  const selectTable = useTableStore((s) => s.selectTable)

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('full')
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})
  const [tenderedAmount, setTenderedAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [finalChange, setFinalChange] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Split State
  const [splitCount, setSplitCount] = useState(2)

  const total = order?.totalAmount || 0
  const paidAmount = order?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remainingAmount = total - paidAmount

  // Filter out paid items for display
  const unpaidItems = useMemo(() => {
    return order?.items?.filter((item) => !item.isPaid) || []
  }, [order?.items])

  // Calculate selected items total
  const selectedTotal = useMemo(() => {
    return unpaidItems.reduce((sum, item) => {
      const qty = selectedQuantities[item.id] || 0
      return sum + qty * item.unitPrice
    }, 0)
  }, [unpaidItems, selectedQuantities])

  const isAllItemsSelected = useMemo(() => {
    if (unpaidItems.length === 0) return false
    return unpaidItems.every((item) => (selectedQuantities[item.id] || 0) === item.quantity)
  }, [unpaidItems, selectedQuantities])

  // Reset states on open/close
  useEffect(() => {
    if (open) {
      // Use setTimeout to avoid synchronous state update warning
      const timer = setTimeout(() => {
        setPaymentMode('full')
        setTenderedAmount('')
        setSplitCount(2)
      }, 0)
      return () => clearTimeout(timer)
    }
    // Clean up success timer on unmount
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [open])

  // Get the payment amount based on mode
  const getPaymentAmount = (): number => {
    switch (paymentMode) {
      case 'full':
        return remainingAmount
      case 'items':
        return selectedTotal
      case 'split': {
        const splitShare = Math.ceil(remainingAmount / splitCount)
        return splitShare
      }
      default:
        return 0
    }
  }

  const paymentAmount = getPaymentAmount()
  // Cap the actual payment at the remaining amount
  const effectivePayment = Math.min(paymentAmount, remainingAmount)

  const tendered = Math.round((parseFloat(tenderedAmount) || 0) * 100)

  // Calculate change based on what we are REALLY taking (effectivePayment)
  const currentChange = Math.max(0, tendered - effectivePayment)

  const updateQuantity = (itemId: string, delta: number, max: number): void => {
    setSelectedQuantities((prev) => {
      const current = prev[itemId] || 0
      const next = Math.min(Math.max(0, current + delta), max)

      if (next === 0) {
        const newQuantities = { ...prev }
        delete newQuantities[itemId]
        return newQuantities
      }

      return { ...prev, [itemId]: next }
    })
  }

  const selectAllItems = (): void => {
    const all: Record<string, number> = {}
    unpaidItems.forEach((item) => {
      all[item.id] = item.quantity
    })
    setSelectedQuantities(all)
  }

  // Keyboard Support for Numpad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ignore if focus is inside an input or textarea (unlikely in this modal but safe)
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      const key = e.key
      if (/^[0-9]$/.test(key)) {
        handleTenderedChange(tenderedAmount + key)
      } else if (key === '.' || key === ',') {
        // Prevent multiple decimal points
        if (!tenderedAmount.includes('.')) {
          handleTenderedChange(tenderedAmount + '.')
        }
      } else if (key === 'Backspace') {
        handleTenderedChange(tenderedAmount.slice(0, -1))
      } else if (key === 'Delete' || key === 'Escape') {
        if (key === 'Delete') setTenderedAmount('')
        // Escape logic is handled by Dialog but extra safety doesn't hurt
      }
    }

    if (open && !paymentComplete) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, tenderedAmount, paymentComplete])

  const handlePayment = async (method: PaymentMethod): Promise<void> => {
    // Logic: If user typed an amount, and it's less than what's due, they are paying that specific amount.
    // If they typed more, they are paying the full amount due (and getting change).
    let actualAmount = effectivePayment
    if (tendered > 0 && tendered < effectivePayment) {
      actualAmount = tendered
    }

    // Allow 0 amount ONLY if in 'items' mode and we have selections (covered by credit)
    if (actualAmount <= 0 && !(paymentMode === 'items' && selectedTotal > 0)) return

    if (method === 'CASH') {
      setFinalChange(currentChange)
    } else {
      setFinalChange(0)
    }
    setIsProcessing(true)

    try {
      const isItemsModeWithSelection =
        paymentMode === 'items' && Object.keys(selectedQuantities).length > 0

      // FIX: Only call processPayment if there is an actual amount to pay.
      // If amount is 0 (covered by credit), we skip this and just mark items.
      if (actualAmount > 0) {
        await onProcessPayment(actualAmount, method, { skipLog: isItemsModeWithSelection })
      }

      // If in items mode, mark selected items as paid
      // We do this if payment succeeded OR if payment was 0 (skipped)
      if (isItemsModeWithSelection) {
        const itemsToPay = Object.entries(selectedQuantities).map(([id, quantity]) => ({
          id,
          quantity
        }))
        const paymentDetails = actualAmount > 0 ? { amount: actualAmount, method } : undefined
        await onMarkItemsPaid(itemsToPay, paymentDetails)
      }

      // Determine if we should close modal
      const effectivelyPaid = actualAmount
      const newRemaining = remainingAmount - effectivelyPaid

      // 3. Close if remaining amount is basically 0
      const shouldClose = newRemaining <= 0.01

      setIsProcessing(false)
      soundManager.playSuccess()
      setTenderedAmount('') // Clear input after successful payment
      setSelectedQuantities({}) // Reset item selections after payment

      if (shouldClose) {
        setPaymentComplete(true)
        timerRef.current = setTimeout(() => {
          onClose()
          if (onPaymentComplete) {
            onPaymentComplete()
          } else {
            selectTable(null, null)
          }
        }, 3000)
      } else {
        // Partial payment successful
      }
    } catch (error) {
      console.error('Payment failed:', error)
      setIsProcessing(false)
      // Ideally show toast here
    }
  }

  const handleClose = (): void => {
    // Check if we are closing a completed payment manually
    if (paymentComplete) {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (onPaymentComplete) {
        onPaymentComplete()
      } else {
        selectTable(null, null)
      }
    }

    setPaymentMode('full')
    setSelectedQuantities({})
    setTenderedAmount('')
    setPaymentComplete(false)
    onClose()
  }

  const handleTenderedChange = (val: string): void => {
    // Only allow numbers and one dot
    if (val === '') {
      setTenderedAmount('')
      return
    }

    // Replace any comma with dot for validation
    const NormalizedVal = val.replace(',', '.')

    // Prevent non-numeric characters (except dot)
    if (!/^[0-9.]*$/.test(NormalizedVal)) return

    // Prevent multiple dots
    if ((NormalizedVal.match(/\./g) || []).length > 1) return

    // Limit to 2 decimal places
    if (NormalizedVal.includes('.') && NormalizedVal.split('.')[1].length > 2) return

    setTenderedAmount(NormalizedVal)
  }

  if (paymentComplete) {
    return (
      <Dialog open={open} onOpenChange={handleClose} key="success-modal">
        <DialogContent
          className="sm:max-w-md border-none p-0 overflow-hidden bg-transparent shadow-none"
          aria-describedby={undefined}
        >
          <VisuallyHidden.Root asChild>
            <DialogTitle>Ödeme Başarılı</DialogTitle>
          </VisuallyHidden.Root>
          <div className="relative">
            <div className="absolute inset-0 bg-success/10 blur-[60px] rounded-full" />
            {/* Main Content Card */}
            <div className="relative bg-card/95 backdrop-blur-3xl border border-border/10 dark:border-white/10 rounded-[2.5rem] p-12 flex flex-col items-center text-center shadow-[0_0_100px_-20px_rgba(34,197,94,0.3)] animate-in fade-in zoom-in-95 duration-400">
              {/* Success Icon Animation Container */}
              <div className="relative mb-8 pt-4">
                <div className="absolute inset-0 bg-success/20 blur-[40px] rounded-full animate-pulse" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-success to-success/50 p-[1px] shadow-[0_0_50px_-10px_rgba(34,197,94,0.5)]">
                  <div className="w-full h-full rounded-full bg-background/80 dark:bg-black/40 backdrop-blur-xl flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-success drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-10">
                <h3 className="text-4xl font-black text-foreground dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                  Ödeme Başarılı
                </h3>
                <p className="text-lg text-muted-foreground/80 font-medium tracking-wide">
                  İşlem onaylandı, masa hazır.
                </p>
              </div>

              {finalChange > 0 ? (
                <div className="w-full space-y-8 animate-in slide-in-from-bottom-5 duration-700 delay-150">
                  <div className="relative">
                    <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-border/20 dark:via-white/10 to-transparent" />

                    <div className="py-8 relative">
                      {/* Glow effect behind amount */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 bg-warning/10 blur-[50px] rounded-full" />

                      <span className="text-sm font-bold text-warning/90 uppercase tracking-[0.2em] mb-4 block drop-shadow-sm">
                        Müşteriye Verilecek
                      </span>

                      <div className="relative inline-flex items-center justify-center p-8 min-w-[280px] bg-background/50 dark:bg-black/40 border border-border/10 dark:border-white/5 rounded-3xl backdrop-blur-md shadow-2xl">
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-warning/10 to-transparent opacity-50" />
                        <PremiumAmount amount={finalChange} size="6xl" color="warning" />
                      </div>

                      <p className="mt-6 text-sm font-semibold text-warning/80 flex items-center justify-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                        Para üstünü vermeyi unutmayın
                      </p>
                    </div>

                    <div className="absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-border/20 dark:via-white/10 to-transparent" />
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-success/10 rounded-2xl border border-success/20 text-success text-lg font-bold shadow-[0_0_30px_-10px_rgba(34,197,94,0.2)]">
                  <CheckCircle className="w-6 h-6 fill-current text-current/20" />
                  <span>Tam ödeme alındı</span>
                </div>
              )}

              <div className="absolute bottom-6 left-0 right-0 text-center">
                <p className="text-[11px] font-medium text-muted-foreground/40 dark:text-white/20 uppercase tracking-widest">
                  Otomatik Kapanıyor
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} key="payment-modal">
      <DialogContent className="sm:max-w-5xl p-0 gap-0 overflow-hidden h-[680px] flex flex-col md:flex-row rounded-[2.5rem] border-border/10 shadow-4xl bg-background [&>button]:hidden duration-500">
        {/* LEFT PANEL: Summary & Selection (What are we paying?) */}
        <div className="w-[480px] flex flex-col border-r border-border/10 bg-background h-full transition-all duration-500">
          <div className="p-7 pb-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-baseline gap-2.5">
                <DialogTitle className="text-[26px] font-black tracking-tighter text-foreground">
                  Hesap Özeti
                </DialogTitle>
                <div className="flex items-center gap-2.5 text-muted-foreground/30">
                  <span className="text-[20px] font-light">|</span>
                  <span className="text-[14px] font-black text-primary/99 tracking-[0.2em] uppercase">
                    {tableName || order?.table?.name || '---'}
                  </span>
                </div>
              </div>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0 bg-muted/20 hover:bg-destructive/10 hover:text-destructive group transition-all"
                >
                  <Plus className="w-5 h-5 rotate-45 transform" />
                </Button>
              </DialogClose>
            </div>

            {/* Balances */}
            <div className="space-y-2.5 mb-6">
              <div className="p-6 rounded-[2rem] bg-muted/20 border border-border/5 relative overflow-hidden group transition-all hover:bg-muted/30">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />

                <div className="flex justify-between items-start gap-4">
                  {/* Left Column: Kalan */}
                  <div className="flex flex-col items-start gap-2 relative z-10 px-2 flex-1">
                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em]">
                      Kalan Tutar
                    </span>
                    <PremiumAmount amount={remainingAmount} size="3xl" color="primary" />
                  </div>

                  {/* Right Column: Ödenen */}
                  {paidAmount > 0 && (
                    <div className="flex flex-col items-end gap-2 relative z-10 px-2 flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
                      <span className="text-[10px] font-black text-emerald-600/50 uppercase tracking-[0.3em]">
                        Ödenen
                      </span>
                      <PremiumAmount amount={paidAmount} size="2xl" color="success" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Mode Tabs */}
            <div className="flex p-1 bg-muted/40 rounded-2xl mb-4 gap-1 border border-border/5 shadow-inner">
              {[
                { id: 'full', label: 'Tümü' },
                { id: 'split', label: 'Bölüştür' },
                { id: 'items', label: 'Ürün Seç' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setPaymentMode(mode.id as PaymentMode)}
                  className={cn(
                    'flex-1 h-9 rounded-xl text-[11px] font-black transition-all duration-300 uppercase tracking-tight',
                    paymentMode === mode.id
                      ? 'bg-background text-foreground shadow-md border border-border/10'
                      : 'text-muted-foreground/50 hover:text-foreground/70'
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Specific Selection Area */}
          <div className="flex-1 overflow-auto px-7 pb-7 scrollbar-hide">
            {paymentMode === 'full' && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center">
                  <Banknote className="w-8 h-8 text-primary/60" />
                </div>
                <div className="space-y-1">
                  <p className="text-[15px] font-black text-foreground/80 tracking-tight">
                    Hızlı Hesap Kapama
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground/60">
                    Tüm bakiyeye odaklanıldı
                  </p>
                </div>
              </div>
            )}

            {paymentMode === 'split' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
                      Kişi Sayısı
                    </span>
                    <span className="text-base font-black text-primary">{splitCount} Kişi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-xl bg-muted/20 border-border/10 text-xl"
                      onClick={() => setSplitCount((c) => Math.max(2, c - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-xl bg-muted/20 border-border/10 text-xl"
                      onClick={() => setSplitCount((c) => Math.min(20, c + 1))}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4, 5].map((n) => (
                      <Button
                        key={n}
                        variant={splitCount === n ? 'default' : 'outline'}
                        className={cn(
                          'h-11 rounded-xl text-[12px] font-black',
                          splitCount === n ? 'shadow-lg bg-primary' : 'bg-muted/10 border-border/10'
                        )}
                        onClick={() => setSplitCount(n)}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-primary/[0.04] border border-primary/10 text-center relative overflow-hidden shadow-sm">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
                  <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1.5 relative z-10">
                    Kişi Başı
                  </p>
                  <div className="relative z-10">
                    <PremiumAmount amount={getPaymentAmount()} size="2xl" color="primary" />
                  </div>
                </div>
              </div>
            )}

            {paymentMode === 'items' && (
              <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
                    Ürün Listesi
                  </span>
                  <button
                    onClick={() => {
                      if (isAllItemsSelected) {
                        setSelectedQuantities({})
                      } else {
                        selectAllItems()
                      }
                    }}
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline transition-all"
                  >
                    {isAllItemsSelected ? 'Tümünü İptal Et' : 'Tümünü Seç'}
                  </button>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 pb-4 custom-scrollbar">
                  {unpaidItems.map((item) => {
                    const selected = selectedQuantities[item.id] || 0
                    const isMulti = item.quantity > 1

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (!isMulti) {
                            updateQuantity(item.id, selected === 0 ? 1 : -1, item.quantity)
                          } else if (selected < item.quantity) {
                            // Sadece 1 artır (Kullanıcı talebi: bitane seçip üzerine tıklanınca artsın)
                            updateQuantity(item.id, 1, item.quantity)
                          }
                        }}
                        className={cn(
                          'p-3 rounded-2xl border transition-all flex items-center justify-between',
                          selected > 0
                            ? 'bg-primary/[0.04] border-primary/20 shadow-sm'
                            : 'bg-muted/10 border-transparent hover:border-border/10 cursor-pointer'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black transition-colors',
                              selected > 0
                                ? 'bg-primary text-white'
                                : 'bg-muted text-muted-foreground/60'
                            )}
                          >
                            {item.quantity}
                          </div>
                          <span className="text-[14px] font-bold text-foreground/85 truncate w-40">
                            {item.product?.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {isMulti && selected > 0 && (
                            <div
                              className="flex items-center bg-background border border-border/20 rounded-lg overflow-hidden shadow-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="w-8 h-8 flex items-center justify-center hover:bg-muted active:bg-muted/80 text-foreground/70 transition-colors"
                                onClick={() => updateQuantity(item.id, -1, item.quantity)}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <div className="w-6 text-center text-[12px] font-black">
                                {selected}
                              </div>
                              <button
                                className="w-8 h-8 flex items-center justify-center hover:bg-muted active:bg-muted/80 text-foreground/70 transition-colors"
                                onClick={() => updateQuantity(item.id, 1, item.quantity)}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <span className="text-[14px] font-black tabular-nums text-foreground/70 min-w-[50px] text-right transition-all duration-300">
                            {formatCurrency(item.unitPrice * (selected || 1))}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Interaction Area (The Transaction Hub) */}
        <div className="flex-1 flex flex-col bg-muted/5 relative h-full transition-all duration-500 overflow-hidden">
          {/* Top Status Area: Side-by-Side Dual Display */}
          <div className="px-8 pt-4 pb-2 flex flex-col items-center">
            <div className="flex gap-4 w-full max-w-[640px] mb-8">
              {/* LEFT CARD: Total to Pay (Emerald Screen) */}
              <div className="relative group flex-[1.6]">
                <div className="h-full py-5 rounded-[2.25rem] bg-background border border-border/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05),inset_0_4px_12px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center transition-all hover:scale-[1.01] hover:border-emerald-500/20 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-50" />
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

                  <span className="text-[10px] font-black text-emerald-600/70 uppercase tracking-[0.4em] mb-2 relative z-10">
                    Toplam Tutar
                  </span>

                  <div className="flex items-center gap-1 relative z-10">
                    <PremiumAmount amount={effectivePayment} size="4xl" color="primary" />
                  </div>
                </div>
              </div>

              {/* RIGHT CARD: Tendered/Input (Sapphire Screen) */}
              <div className="flex-1 relative group">
                <div className="h-full pt-3 pb-5 rounded-[2.25rem] bg-background border border-border/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05),inset_0_4px_12px_rgba(0,0,0,0.05)] flex flex-col items-center justify-between transition-all hover:scale-[1.01] hover:border-indigo-500/20 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent opacity-50" />
                  <div className="w-full flex items-center justify-between px-6 mb-1 relative z-10">
                    <span className="text-[10px] font-black text-indigo-600/70 uppercase tracking-[0.3em] whitespace-nowrap">
                      Alınan Para
                    </span>
                    <button
                      onClick={() => setTenderedAmount('')}
                      className="p-1.5 rounded-xl bg-muted text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all active:scale-90 border border-transparent hover:border-destructive/20"
                      title="Sıfırla"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
                  <div className="px-6 w-full flex justify-end items-end gap-1 relative z-10">
                    <span
                      className={cn(
                        'font-mono text-3xl font-black tabular-nums transition-all tracking-tight',
                        tenderedAmount ? 'text-indigo-600' : 'text-muted-foreground/10'
                      )}
                    >
                      {tenderedAmount ? formatCurrency(tendered) : '₺ 0,00'}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-600/20 to-transparent" />
                </div>
              </div>
            </div>

            {/* Result Display: Change OR Warning for Shortfall */}
            <div className="w-full max-w-[640px] h-[72px] mb-2 px-1 flex items-center">
              {tendered > effectivePayment ? (
                <div className="w-full py-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 shadow-sm flex items-center justify-between px-6 animate-in fade-in slide-in-from-top-2 duration-500 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-sm font-black text-amber-600 uppercase tracking-tight">
                        Para Üstü
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <PremiumAmount amount={currentChange} size="2xl" color="warning" />
                  </div>
                </div>
              ) : tendered > 0 && tendered < effectivePayment ? (
                <div className="w-full py-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 shadow-sm flex items-center justify-between px-6 animate-in fade-in slide-in-from-top-2 duration-500 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-sm font-black text-blue-600">Parçalı Tahsilat</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <PremiumAmount amount={tendered} size="2xl" color="info" />
                  </div>
                </div>
              ) : (
                <div className="w-full py-4 rounded-2xl bg-muted/10 border border-dashed border-border/20 flex items-center justify-center gap-3 opacity-60">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" />
                  <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.3em]">
                    Ödeme Bekleniyor
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Controls & Action Buttons */}
          <div className="mt-auto p-8 pt-0 flex flex-col gap-4 w-full max-w-[560px] mx-auto">
            {/* Quick Cash + Grid Numpad */}
            <div className="flex gap-4">
              {/* Numpad Container */}
              <div className="flex-1 grid grid-cols-3 gap-2.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '00', 0].map((n) => (
                  <Button
                    key={n}
                    variant="ghost"
                    className="h-[68px] rounded-2xl bg-background border border-border/10 text-2xl font-black shadow-sm active:scale-95 transition-all hover:bg-muted/50 hover:border-primary/30 hover:text-primary"
                    onClick={() => handleTenderedChange(tenderedAmount + n.toString())}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="h-[68px] rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white shadow-sm active:scale-95 transition-all border border-destructive/20 flex items-center justify-center group"
                  onClick={() => handleTenderedChange(tenderedAmount.slice(0, -1))}
                >
                  <Delete className="w-5 h-5 transition-transform group-hover:scale-110" />
                </Button>
              </div>

              {/* Quick Cash Buttons */}
              <div className="w-[110px] flex flex-col gap-2.5">
                {[
                  { val: 50, color: 'blue' },
                  { val: 100, color: 'indigo' },
                  { val: 200, color: 'violet' }
                ].map(({ val, color }) => (
                  <Button
                    key={val}
                    variant="outline"
                    className={cn(
                      'flex-1 rounded-2xl font-black text-[15px] transition-all shadow-sm active:scale-95',
                      color === 'blue' &&
                        'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-600 hover:text-white hover:border-blue-600',
                      color === 'indigo' &&
                        'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-600 hover:text-white hover:border-indigo-600',
                      color === 'violet' &&
                        'bg-violet-500/10 text-violet-600 border-violet-500/20 hover:bg-violet-600 hover:text-white hover:border-violet-600'
                    )}
                    onClick={() => handleTenderedChange(val.toString())}
                  >
                    ₺{val}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  className="flex-1 rounded-2xl bg-emerald-500/10 border-emerald-500/30 text-emerald-600 font-black text-[11px] uppercase hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-md active:scale-95"
                  onClick={() => handleTenderedChange((effectivePayment / 100).toString())}
                >
                  TAMAMI
                </Button>
              </div>
            </div>

            {/* ACTION BUTTONS (The Grand Finale) */}
            <div className="grid grid-cols-2 gap-4 mb-2">
              <Button
                className="h-16 rounded-[1.25rem] bg-gradient-to-br from-primary to-primary/80 shadow-[0_12px_25px_-5px_rgba(var(--primary-rgb),0.3)] hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group border-b-4 border-primary/20"
                onClick={() => handlePayment('CASH')}
                disabled={
                  isProcessing ||
                  (effectivePayment <= 0 && !(paymentMode === 'items' && selectedTotal > 0))
                }
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2.5 relative z-10 justify-center">
                  <Banknote className="w-6 h-6 text-white" />
                  <span className="text-[16px] font-black tracking-tighter text-white uppercase">
                    NAKİT
                  </span>
                </div>
              </Button>

              <Button
                className="h-16 rounded-[1.25rem] bg-zinc-950 border border-white/5 shadow-2xl hover:bg-zinc-900 hover:border-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group border-b-4 border-black"
                onClick={() => handlePayment('CARD')}
                disabled={
                  isProcessing ||
                  (effectivePayment <= 0 && !(paymentMode === 'items' && selectedTotal > 0)) ||
                  tendered > effectivePayment
                }
              >
                <div className="absolute inset-0 bg-primary opacity-[0.05] group-hover:opacity-[0.1] transition-opacity" />
                <div className="flex items-center gap-2.5 relative z-10 justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                  <span className="text-[16px] font-black tracking-tighter text-white uppercase">
                    KART
                  </span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
