import { useState, useMemo, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Banknote, CreditCard, CheckCircle, Plus, Minus, Delete } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTableStore } from '@/store/useTableStore'
import { type Order, type PaymentMethod } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import { soundManager } from '@/lib/sound'
import { PremiumAmount } from '@/components/PremiumAmount'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  onPaymentComplete?: () => void
  order: Order | null | undefined
  onProcessPayment: (amount: number, method: PaymentMethod) => Promise<unknown>
  onMarkItemsPaid: (items: { id: string; quantity: number }[]) => Promise<unknown>
}

type PaymentMode = 'full' | 'items' | 'split' | 'custom'

export function PaymentModal({
  open,
  onClose,
  onPaymentComplete,
  order,
  onProcessPayment,
  onMarkItemsPaid
}: PaymentModalProps): React.JSX.Element {
  const selectTable = useTableStore((s) => s.selectTable)

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('full')
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})
  const [customAmount, setCustomAmount] = useState('')
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

  // Calculate generic credit (Total Paid - Price of Paid Items) = Unassigned Money
  // But easier way: Sum of Unpaid Items - Remaining Amount
  const unpaidItemsTotal = useMemo(() => {
    return unpaidItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }, [unpaidItems])

  const genericCredit = Math.max(0, unpaidItemsTotal - remainingAmount)

  // Reset states on open/close
  useEffect(() => {
    if (open) {
      // Use setTimeout to avoid synchronous state update warning
      const timer = setTimeout(() => {
        setPaymentMode('full')
        setCustomAmount('')
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
        // Deduct generic credit from selected total
        return Math.max(0, selectedTotal - genericCredit)
      case 'split': {
        const splitShare = Math.ceil(remainingAmount / splitCount)
        return splitShare
      }
      case 'custom':
        return Math.round((parseFloat(customAmount) || 0) * 100)
      default:
        return 0
    }
  }

  const paymentAmount = getPaymentAmount()
  // Cap the actual payment at the remaining amount
  const effectivePayment = Math.min(paymentAmount, remainingAmount)

  const tendered = Math.round((parseFloat(tenderedAmount) || 0) * 100)

  // Smart UX: If in custom mode and entered amount > remaining amount,
  // treat the custom amount as "Tendered" (Received) cash if no explicit tendered amount is set.
  let effectiveTendered = tendered
  const rawCustomAmount =
    paymentMode === 'custom' ? Math.round((parseFloat(customAmount) || 0) * 100) : 0

  if (paymentMode === 'custom' && effectiveTendered === 0 && rawCustomAmount > remainingAmount) {
    effectiveTendered = rawCustomAmount
  }

  // Calculate change based on what we are REALLY taking (effectivePayment)
  const currentChange = Math.max(0, effectiveTendered - effectivePayment)

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

  const handlePayment = async (method: PaymentMethod): Promise<void> => {
    // Safety check: Don't allow paying more than remaining
    // effectivePayment is already capped by remainingAmount
    const actualAmount = effectivePayment

    // Allow 0 amount ONLY if in 'items' mode and we have selections (covered by credit)
    if (actualAmount <= 0 && !(paymentMode === 'items' && selectedTotal > 0)) return

    if (method === 'CASH') {
      setFinalChange(currentChange)
    } else {
      setFinalChange(0)
    }
    setIsProcessing(true)

    try {
      // FIX: Only call processPayment if there is an actual amount to pay.
      // If amount is 0 (covered by credit), we skip this and just mark items.
      if (actualAmount > 0) {
        await onProcessPayment(actualAmount, method)
      }

      // If in items mode, mark selected items as paid
      // We do this if payment succeeded OR if payment was 0 (skipped)
      if (paymentMode === 'items' && Object.keys(selectedQuantities).length > 0) {
        const itemsToPay = Object.entries(selectedQuantities).map(([id, quantity]) => ({
          id,
          quantity
        }))
        await onMarkItemsPaid(itemsToPay)
      }

      // Determine if we should close modal
      const effectivelyPaid = actualAmount
      const newRemaining = remainingAmount - effectivelyPaid

      // 3. Close if remaining amount is basically 0
      const shouldClose = newRemaining <= 0.01

      setIsProcessing(false)
      soundManager.playSuccess()

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
        setCustomAmount('')
        setTenderedAmount('')
        setSelectedQuantities({}) // Clear selected items after payment

        if (paymentMode !== 'split' && paymentMode !== 'items') {
          setPaymentMode('full')
        }
      }
    } catch (error) {
      console.error('Payment failed:', error)
      setIsProcessing(false)
      // Ideally show toast here
    }
  }

  // Keypad handler for Custom Amount
  const handleKeypad = (val: string): void => {
    if (val === 'backspace') {
      setCustomAmount((prev) => prev.slice(0, -1))
    } else if (val === 'clear') {
      setCustomAmount('')
    } else if (val === '.') {
      if (!customAmount.includes('.')) {
        setCustomAmount((prev) => prev + '.')
      }
    } else {
      // Limit decimal places
      if (customAmount.includes('.') && customAmount.split('.')[1].length >= 2) return
      setCustomAmount((prev) => prev + val)
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
    setCustomAmount('')
    setTenderedAmount('')
    setPaymentComplete(false)
    onClose()
  }

  const handleTenderedChange = (val: string): void => {
    setTenderedAmount(val)

    // Proactive Logic: If in custom mode, update amount to match tendered (capped at remaining)
    // This guides the user and prevents accidental "large change" scenarios for partial payments.
    if (paymentMode === 'custom') {
      const tenderedVal = parseFloat(val) || 0
      if (tenderedVal > 0) {
        // Cap at remaining amount
        const remainingUnits = remainingAmount / 100
        const smartAmount = Math.min(tenderedVal, remainingUnits)
        setCustomAmount(parseFloat(smartAmount.toFixed(2)).toString())
      }
    }
  }

  if (paymentComplete) {
    return (
      <Dialog open={open} onOpenChange={handleClose} key="success-modal">
        <DialogContent className="sm:max-w-md border-none p-0 overflow-hidden bg-transparent shadow-none">
          <div className="relative">
            <div className="absolute inset-0 bg-success/10 blur-[60px] rounded-full" />
            {/* Main Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              transition={{
                duration: 0.4,
                ease: 'easeOut'
              }}
              className="relative bg-card/95 backdrop-blur-3xl border border-border/10 dark:border-white/10 rounded-[2.5rem] p-12 flex flex-col items-center text-center shadow-[0_0_100px_-20px_rgba(34,197,94,0.3)]"
            >
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
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} key="payment-modal">
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden h-[620px] flex flex-col md:flex-row rounded-[2.5rem] border-border/10 shadow-3xl bg-background [&>button]:hidden duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-bottom-12">
        {/* Left Side: Payment Methods and Modes */}
        <div className="flex-1 flex flex-col p-8 pb-6 bg-background">
          <DialogHeader className="mb-6 flex flex-row items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-[22px] font-bold tracking-tight">Ödeme Al</DialogTitle>
              <DialogDescription className="text-muted-foreground/60">
                Ödeme yöntemini seçin
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-5 rounded-xl -mt-1 -mr-2 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold transition-all duration-300 border border-destructive/10 shadow-sm"
              >
                İptal
              </Button>
            </DialogClose>
          </DialogHeader>

          {/* Mode Selection Tabs - Theme Sync */}
          <div className="flex p-1.5 premium-card mb-6 gap-2 self-start">
            {[
              { id: 'full', label: 'Tamamı' },
              { id: 'split', label: 'Bölüşmeli' },
              { id: 'items', label: 'Ürün Seç' },
              { id: 'custom', label: 'Tutar' }
            ].map((mode) => (
              <Button
                key={mode.id}
                variant="ghost"
                size="sm"
                onClick={() => setPaymentMode(mode.id as PaymentMode)}
                className={cn(
                  'h-10 px-6 rounded-xl text-sm font-bold transition-all duration-300',
                  paymentMode === mode.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                {mode.label}
              </Button>
            ))}
          </div>

          {/* Dynamic Content Based on Mode */}
          <div className="flex-1 overflow-visible relative">
            <AnimatePresence mode="wait" initial={false}>
              {paymentMode === 'full' && (
                <motion.div
                  key="full"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col items-center justify-center space-y-4 p-4 text-center absolute inset-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-muted-foreground/60">
                      Kalan Tutarın Tamamı
                    </p>
                    <PremiumAmount amount={remainingAmount} size="3xl" color="primary" />
                  </div>

                  <div className="px-6 py-4 premium-card ambient-glow flex items-center gap-3">
                    <p className="text-xs text-primary/70 font-bold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Tek seferde hızlı ödeme
                    </p>
                  </div>
                </motion.div>
              )}

              {paymentMode === 'split' && (
                <motion.div
                  key="split"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 absolute inset-0 overflow-auto p-4"
                >
                  <div className="text-center mt-8">
                    <p className="text-muted-foreground/70 mb-3 text-sm">Kaça bölünecek?</p>
                    <div className="flex justify-center gap-3 items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-2xl bg-muted/30 hover:bg-muted/50 text-foreground/70 hover:text-foreground transition-all text-xl font-bold"
                        onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                      >
                        −
                      </Button>
                      <div className="w-16 h-16 rounded-2xl bg-background border border-border/10 flex items-center justify-center shadow-sm">
                        <span className="text-3xl font-bold text-foreground tabular-nums">
                          {splitCount}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-2xl bg-muted/30 hover:bg-muted/50 text-foreground/70 hover:text-foreground transition-all text-xl font-bold"
                        onClick={() => setSplitCount(Math.min(10, splitCount + 1))}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div className="p-6 premium-card ambient-glow text-center mx-4">
                    <p className="text-[12px] font-semibold text-muted-foreground/60 mb-1">
                      Kişi Başı Düşen
                    </p>
                    <PremiumAmount
                      amount={Math.ceil(remainingAmount / splitCount)}
                      size="2xl"
                      color="primary"
                    />
                  </div>
                </motion.div>
              )}

              {paymentMode === 'items' && (
                <motion.div
                  key="items"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col absolute inset-0 p-4"
                >
                  <div className="flex justify-between items-center mb-3 px-1">
                    <span className="text-[11px] font-semibold text-muted-foreground/60">
                      Ödenecek Ürünler
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllItems}
                      className="h-6 text-[11px] font-semibold text-primary/70 hover:text-primary px-2"
                    >
                      Tümünü Seç
                    </Button>
                  </div>

                  {genericCredit > 0 && (
                    <div className="mb-3 px-3 py-2.5 bg-info/5 border border-info/10 rounded-xl text-[11px] text-info/80 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-info/60 shrink-0" />
                      <span>
                        Önceden yapılan{' '}
                        <span className="font-semibold">{formatCurrency(genericCredit)}</span> genel
                        ödeme seçilenlerden düşülecektir.
                      </span>
                    </div>
                  )}

                  <div className="flex-1 rounded-2xl overflow-y-auto p-1 space-y-1">
                    {unpaidItems.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Liste boş
                      </div>
                    ) : (
                      unpaidItems.map((item) => {
                        const selected = selectedQuantities[item.id] || 0
                        return (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${item.product?.name || 'Ürün'}, ${item.quantity} adet`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                updateQuantity(
                                  item.id,
                                  selected < item.quantity ? 1 : 0,
                                  item.quantity
                                )
                              }
                            }}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-primary/20',
                              selected > 0
                                ? 'bg-primary/[0.04] border-primary/20 shadow-sm'
                                : 'border-transparent hover:bg-muted/30'
                            )}
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                selected < item.quantity ? 1 : 0,
                                item.quantity
                              )
                            }
                          >
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                              <div
                                className={cn(
                                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0',
                                  selected > 0
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {item.quantity}
                              </div>
                              <span className="truncate font-medium">
                                {item.product?.name || 'Ürün'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold tabular-nums">
                                  {formatCurrency(selected * item.unitPrice)}
                                </span>
                              </div>

                              {selected > 0 && (
                                <div
                                  className="flex items-center bg-background/80 backdrop-blur-sm rounded-lg border border-border/10 shadow-sm overflow-hidden"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-none hover:bg-muted/50"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateQuantity(item.id, -1, item.quantity)
                                    }}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <div className="px-2 h-8 flex items-center justify-center text-[11px] font-bold border-x border-border/5 tabular-nums min-w-[32px]">
                                    {selected}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-none hover:bg-muted/50"
                                    disabled={selected >= item.quantity}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateQuantity(item.id, 1, item.quantity)
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground/60">
                      Seçilen Tutar
                    </span>
                    <PremiumAmount amount={selectedTotal} size="xl" color="primary" />
                  </div>
                </motion.div>
              )}

              {paymentMode === 'custom' && (
                <motion.div
                  key="custom"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col px-1 absolute inset-0 p-4"
                >
                  {/* Amount Display - Simple Underlined Aesthetic */}
                  <div className="mb-6 pt-4 text-center">
                    <div className="inline-flex items-end justify-center min-w-[200px] pb-3 border-b-2 border-border/10">
                      <PremiumAmount
                        amount={Math.round((parseFloat(customAmount) || 0) * 100)}
                        size="3xl"
                      />
                    </div>
                  </div>

                  {/* Keypad - Dark & Minimal (Exact Reference) */}
                  <div className="grid grid-cols-3 gap-2 flex-1 pb-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((n) => (
                      <Button
                        key={n}
                        variant="ghost"
                        className="text-2xl font-bold h-full min-h-[52px] rounded-xl bg-card hover:bg-[#1a1a1a] border border-border/5 shadow-sm active:scale-[0.97] transition-all"
                        onClick={() => handleKeypad(n.toString())}
                      >
                        {n}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      className="h-full min-h-[52px] rounded-xl bg-destructive/80 text-white hover:bg-destructive shadow-sm active:scale-[0.97] transition-all"
                      onClick={() => handleKeypad('backspace')}
                    >
                      <Delete className="w-6 h-6" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side: Summary & Actions */}
        <div className="flex flex-col w-full border-l md:w-[380px] bg-muted/20 p-4 h-full">
          <div className="flex flex-col gap-3 mb-4">
            {/* Paid Amount Area - Only if there are previous payments */}
            {paidAmount > 0 && (
              <div className="premium-item p-4 relative animate-in fade-in slide-in-from-top-2 duration-500 shadow-[0_4px_20px_-8px_rgba(var(--color-success-rgb),0.35)]">
                {/* Background Tint Layer */}
                <div className="absolute inset-0 bg-primary/[0.08]" />

                <div className="relative w-full flex items-center justify-between">
                  <span className="text-[11px] font-black text-primary uppercase tracking-[0.15em]">
                    Ödenen Ara Toplam
                  </span>
                  <PremiumAmount amount={paidAmount} size="lg" color="primary" />
                </div>
              </div>
            )}

            {/* Remaining Amount Area - Primary Focus */}
            <div className="relative group p-6 premium-card ambient-glow overflow-hidden shadow-[0_15px_40px_-15px_rgba(0,0,0,0.2)] hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-primary/10 blur-3xl opacity-50" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-1">
                    Ödenecek Kalan
                  </span>
                  <PremiumAmount amount={remainingAmount} size="2xl" />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-auto space-y-2.5">
            <div
              style={{ '--color-border': 'var(--color-primary)' } as React.CSSProperties}
              className="mt-0.5 animate-in fade-in slide-in-from-top-2 duration-500 premium-card ambient-glow p-5 flex items-center justify-between shadow-[0_10px_30px_-10px_rgba(var(--color-primary-rgb),0.25)] hover:scale-[1.02] transition-all"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.15em] mb-1">
                  Tahsil Edilecek
                </span>
                <PremiumAmount amount={effectivePayment} size="xl" color="primary" />
              </div>
            </div>

            {paymentMode !== 'custom' ? (
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-semibold text-muted-foreground/50">
                    Nakit Hesaplayıcı
                  </label>
                  {tenderedAmount && (
                    <button
                      onClick={() => setTenderedAmount('')}
                      className="text-[11px] font-bold text-primary/80 hover:text-primary transition-colors"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {[10, 20, 50, 100, 200].map((val) => {
                    const isDisabled = val * 100 < effectivePayment
                    return (
                      <Button
                        key={val}
                        variant="ghost"
                        size="sm"
                        disabled={isDisabled}
                        className={cn(
                          'h-9 bg-background/50 text-[12px] font-bold transition-all border border-border/5 rounded-xl shadow-sm hover:bg-primary hover:text-primary-foreground',
                          isDisabled && 'opacity-20'
                        )}
                        onClick={() => handleTenderedChange(val.toString())}
                      >
                        ₺ {val}
                      </Button>
                    )
                  })}
                </div>

                <div className="relative">
                  <Input
                    className="h-20 border border-border/10 bg-background hover:bg-accent/50 focus:bg-accent/30 text-right font-mono text-3xl md:text-5xl font-bold rounded-2xl shadow-sm transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-muted-foreground/20"
                    placeholder="₺0,00"
                    value={tenderedAmount}
                    onChange={(e) => handleTenderedChange(e.target.value)}
                    type="number"
                  />
                </div>

                {tendered > 0 && (
                  <div className="mt-2 p-2 px-3 bg-warning/5 border border-warning/10 rounded-xl flex items-center justify-between animate-in fade-in zoom-in-95">
                    <span className="text-[11px] font-bold text-warning/70 uppercase">
                      Para Üstü
                    </span>
                    <PremiumAmount amount={currentChange} size="lg" color="warning" />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4">
                {rawCustomAmount > 0 && (
                  <div
                    style={
                      {
                        '--color-border':
                          rawCustomAmount > remainingAmount
                            ? 'var(--color-warning)'
                            : rawCustomAmount < remainingAmount
                              ? 'var(--color-info)'
                              : 'var(--color-success)'
                      } as React.CSSProperties
                    }
                    className={cn(
                      'premium-card ambient-glow p-5 animate-in fade-in zoom-in-95 duration-300',
                      rawCustomAmount > remainingAmount
                        ? 'bg-warning/5'
                        : rawCustomAmount < remainingAmount
                          ? 'bg-info/5'
                          : 'bg-success/5'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={cn(
                          'text-[11px] font-semibold',
                          rawCustomAmount > remainingAmount
                            ? 'text-warning/80'
                            : rawCustomAmount < remainingAmount
                              ? 'text-info/80'
                              : 'text-success/80'
                        )}
                      >
                        {rawCustomAmount > remainingAmount
                          ? 'Para Üstü'
                          : rawCustomAmount < remainingAmount
                            ? 'Eksik Kalan'
                            : 'Tam Ödeme'}
                      </span>
                      {rawCustomAmount !== remainingAmount && (
                        <div
                          className={cn(
                            'h-1.5 w-1.5 rounded-full animate-pulse',
                            rawCustomAmount > remainingAmount ? 'bg-warning' : 'bg-info'
                          )}
                        />
                      )}
                    </div>
                    <div
                      className={cn(
                        'text-3xl font-bold tabular-nums tracking-tight',
                        rawCustomAmount > remainingAmount
                          ? 'text-warning'
                          : rawCustomAmount < remainingAmount
                            ? 'text-info'
                            : 'text-success'
                      )}
                    >
                      {formatCurrency(Math.abs(rawCustomAmount - remainingAmount))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3.5">
            <Button
              className="group relative h-16 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/95 to-primary/60 p-0 shadow-lg transition-all duration-300 hover:shadow-primary/20 hover:shadow-2xl active:scale-[0.96]"
              onClick={() => handlePayment('CASH')}
              disabled={
                isProcessing ||
                (paymentAmount <= 0 && !(paymentMode === 'items' && selectedTotal > 0))
              }
            >
              <div className="flex w-full items-center justify-center gap-3 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-start leading-none text-left">
                  <span className="text-base font-black tracking-tight">NAKİT</span>
                </div>
              </div>
            </Button>

            <Button
              className="group h-16 rounded-2xl border border-white/5 bg-[#0c0c0c] p-0 shadow-xl transition-all duration-300 hover:border-primary/30 hover:bg-[#151515] active:scale-[0.96]"
              disabled={
                isProcessing ||
                (paymentAmount <= 0 && !(paymentMode === 'items' && selectedTotal > 0)) ||
                (paymentMode === 'custom'
                  ? rawCustomAmount > remainingAmount
                  : tendered > effectivePayment)
              }
              onClick={() => handlePayment('CARD')}
            >
              <div className="flex w-full items-center justify-center gap-3 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-active:scale-95 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-start leading-none text-left">
                  <span className="text-base font-black tracking-tight">Kart</span>
                </div>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
