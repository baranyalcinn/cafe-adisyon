import { useState, useMemo, useEffect } from 'react'
import { Banknote, CreditCard, CheckCircle, Delete, Plus, Minus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTableStore } from '@/store/useTableStore'
import { type Order, type PaymentMethod } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import { soundManager } from '@/lib/sound'

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
  const { selectTable } = useTableStore()

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('full')
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})
  const [customAmount, setCustomAmount] = useState('')
  const [tenderedAmount, setTenderedAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [finalChange, setFinalChange] = useState(0)

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
    return undefined
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
        // FIX: Calculate split based on TOTAL, not remaining.
        // Cap at remainingAmount to ensure we don't overpay on the last split.
        const splitShare = Math.ceil(total / splitCount)
        return Math.min(splitShare, remainingAmount)
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
        setTimeout(() => {
          onClose()
          if (onPaymentComplete) {
            onPaymentComplete()
          } else {
            selectTable(null)
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
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md border-none p-0 overflow-hidden bg-transparent shadow-none">
          <div className="relative animate-in zoom-in-95 duration-500">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full" />
            {/* Main Content Card */}
            <div className="relative bg-card/80 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-bounce duration-[2000ms]">
                <CheckCircle className="w-14 h-14 text-emerald-500" />
              </div>
              <h3 className="text-3xl font-black text-foreground tracking-tight mb-2">
                ÖDEME BAŞARILI
              </h3>
              <p className="text-muted-foreground font-medium mb-8">
                İşlem kaydedildi ve masa boşaltıldı.
              </p>

              {finalChange > 0 ? (
                <div className="w-full space-y-4">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="py-4">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-3 block">
                      MÜŞTERİYE VERİLECEK
                    </span>
                    <div className="relative inline-block px-8 py-4 bg-primary/10 rounded-[2rem] border border-primary/20">
                      <p className="text-6xl font-black text-primary tabular-nums tracking-tighter">
                        <span className="text-3xl font-bold mr-1">₺</span>
                        {formatCurrency(finalChange).replace('₺', '')}
                      </p>
                    </div>
                    <p className="mt-4 text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                      PARA ÜSTÜNÜ VERMEYİ UNUTMAYIN
                    </p>
                  </div>
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                </div>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-500 font-bold text-sm">
                  <span>TAM ÖDEME ALINDI</span>
                </div>
              )}

              <div className="mt-10 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                BU PENCERE OTOMATİK KAPANACAKTIR
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden h-[600px] flex flex-col md:flex-row">
        {/* Left Side: Payment Methods and Modes */}
        <div className="flex-1 flex flex-col p-6 bg-background">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold">Ödeme Al</DialogTitle>
            <DialogDescription>Ödeme yöntemini seçin</DialogDescription>
          </DialogHeader>

          {/* Mode Selection Tabs */}
          <div className="grid grid-cols-4 gap-2 mb-6 bg-muted/50 p-1 rounded-xl">
            <Button
              variant={paymentMode === 'full' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPaymentMode('full')}
              className="rounded-lg text-xs md:text-sm font-medium transition-all"
            >
              Tamamı
            </Button>
            <Button
              variant={paymentMode === 'split' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPaymentMode('split')}
              className="rounded-lg text-xs md:text-sm font-medium transition-all"
            >
              Bölüşmeli
            </Button>
            <Button
              variant={paymentMode === 'items' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPaymentMode('items')}
              className="rounded-lg text-xs md:text-sm font-medium transition-all"
            >
              Ürün Seç
            </Button>
            <Button
              variant={paymentMode === 'custom' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPaymentMode('custom')}
              className="rounded-lg text-xs md:text-sm font-medium transition-all"
            >
              Tutar
            </Button>
          </div>

          {/* Dynamic Content Based on Mode */}
          <div className="flex-1 overflow-auto">
            {paymentMode === 'full' && (
              <div className="h-full flex flex-col items-center justify-center space-y-2 text-center">
                <p className="text-muted-foreground">Kalan Tutarın Tamamı</p>
                <div className="text-5xl font-bold tabular-nums text-primary">
                  {formatCurrency(remainingAmount)}
                </div>
              </div>
            )}

            {paymentMode === 'split' && (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">Kaça bölünecek?</p>
                  <div className="flex justify-center gap-4 items-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                    >
                      -
                    </Button>
                    <span className="text-4xl font-bold w-12 text-center">{splitCount}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() => setSplitCount(Math.min(10, splitCount + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-primary/5 rounded-xl text-center border-2 border-primary/10">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Kişi Başı
                  </p>
                  <p className="text-4xl font-extrabold text-primary tabular-nums">
                    {/* Fixed Logic: Use Total, not Remaining */}
                    {formatCurrency(Math.min(remainingAmount, Math.ceil(total / splitCount)))}
                  </p>
                </div>
              </div>
            )}

            {paymentMode === 'items' && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-xs uppercase font-bold text-muted-foreground">
                    Ödenecekler
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllItems}
                    className="h-6 text-xs"
                  >
                    Tümünü Seç
                  </Button>
                </div>

                {genericCredit > 0 && (
                  <div className="mb-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-600 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>
                      Önceden yapılan <b>{formatCurrency(genericCredit)}</b> genel ödeme
                      seçilenlerden düşülecektir.
                    </span>
                  </div>
                )}

                <div className="flex-1 border rounded-lg overflow-y-auto p-2 space-y-1">
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
                            'flex items-center justify-between p-2 rounded-md border transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-primary',
                            selected > 0
                              ? 'bg-primary/10 border-primary'
                              : 'border-transparent hover:bg-muted'
                          )}
                          onClick={() =>
                            updateQuantity(item.id, selected < item.quantity ? 1 : 0, item.quantity)
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
                                className="flex items-center bg-background rounded-md border shadow-sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-none rounded-l-md hover:bg-muted"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateQuantity(item.id, -1, item.quantity)
                                  }}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <div className="w-8 h-7 flex items-center justify-center text-xs font-bold border-x bg-muted/20 tabular-nums">
                                  {selected}/{item.quantity}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-none rounded-r-md hover:bg-muted"
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
                <div className="mt-2 text-right">
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {formatCurrency(selectedTotal)}
                  </span>
                </div>
              </div>
            )}

            {paymentMode === 'custom' && (
              <div className="h-full flex flex-col">
                <div className="mb-4 text-center">
                  <div className="text-4xl font-bold tabular-nums text-foreground border-b-2 border-primary/20 pb-2 inline-block min-w-[200px]">
                    {customAmount ? (
                      `₺${customAmount}`
                    ) : (
                      <span className="text-muted-foreground/30">₺0.00</span>
                    )}
                  </div>
                </div>
                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2 flex-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((n) => (
                    <Button
                      key={n}
                      variant="outline"
                      className="text-2xl font-semibold h-full"
                      onClick={() => handleKeypad(n.toString())}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button
                    variant="destructive"
                    className="h-full"
                    onClick={() => handleKeypad('backspace')}
                  >
                    <Delete className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Summary & Actions */}
        <div className="flex flex-col w-full border-l md:w-[350px] bg-muted/20 p-6 overflow-y-auto">
          {/* Hero Balance Card */}
          <div className="relative mb-4 overflow-hidden border border-primary/30 rounded-[2.5rem] bg-card p-6 shadow-2xl shadow-primary/10">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative z-10">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-widest text-muted-foreground/60">
                    Toplam
                  </p>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(total)}</p>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-widest text-emerald-500/80">
                    Tahsil Edilen
                  </p>
                  <p className="text-lg font-bold text-emerald-500 tabular-nums">
                    {formatCurrency(paidAmount)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full bg-primary shadow-[0_0_12px_rgba(var(--primary),0.6)] transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, (paidAmount / total) * 100)}%` }}
                />
              </div>

              <div className="space-y-1 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary/70">
                  KALAN BAKİYE
                </p>
                <p className="text-5xl font-extrabold tracking-tighter text-foreground tabular-nums">
                  {formatCurrency(remainingAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-auto space-y-4">
            <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-500 rounded-[2rem] border border-primary/10 bg-primary/5 p-6 text-center">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary">
                ŞİMDİ TAHSİL EDİLECEK
              </p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-4xl font-extrabold tracking-tight text-primary tabular-nums">
                  {formatCurrency(effectivePayment)}
                </p>
              </div>

              {effectivePayment < remainingAmount && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>SONA KALAN:</span>
                  <span className="tabular-nums">
                    {formatCurrency(remainingAmount - effectivePayment)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between px-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                  NAKİT HESAPLAYICI
                </label>
                {tenderedAmount && (
                  <button
                    onClick={() => setTenderedAmount('')}
                    className="text-[9px] font-black text-primary hover:opacity-80 transition-opacity"
                  >
                    SIFIRLA
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1.5 px-1">
                {[10, 20, 50, 100, 200].map((val) => {
                  const isDisabled = val * 100 < effectivePayment
                  return (
                    <Button
                      key={val}
                      variant="outline"
                      size="sm"
                      disabled={isDisabled}
                      className={cn(
                        'h-9 border-none bg-background/50 text-[11px] font-black transition-all hover:bg-primary hover:text-primary-foreground rounded-xl shadow-sm',
                        isDisabled && 'opacity-20 backdrop-blur-none'
                      )}
                      onClick={() => handleTenderedChange(val.toString())}
                    >
                      ₺{val}
                    </Button>
                  )
                })}
              </div>

              <div className="relative group">
                <Input
                  className="h-14 border-none bg-background/40 text-right font-mono text-2xl font-black rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/20 transition-all shadow-inner"
                  placeholder="₺0.00"
                  value={tenderedAmount}
                  onChange={(e) => handleTenderedChange(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>

              {tendered > 0 && (
                <div className="mt-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                      PARA ÜSTÜ
                    </span>
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  </div>
                  <div className="text-3xl font-extrabold text-amber-600 tabular-nums text-right tracking-tight">
                    {formatCurrency(currentChange)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <Button
              className="w-full h-16 text-lg gap-3 shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-black tracking-widest rounded-2xl border-b-4 border-primary/30"
              variant="default"
              size="lg"
              disabled={
                isProcessing ||
                (paymentAmount <= 0 && !(paymentMode === 'items' && selectedTotal > 0))
              }
              onClick={() => handlePayment('CASH')}
            >
              <Banknote className="w-6 h-6" />
              {paymentMode === 'items' && paymentAmount === 0 && selectedTotal > 0
                ? 'ÜRÜNLERİ KAPAT'
                : 'NAKİT TAHSİLAT'}
            </Button>
            <Button
              className="w-full h-14 text-base gap-3 font-bold tracking-wide rounded-2xl bg-muted/50 hover:bg-muted hover:text-foreground transition-all"
              variant="secondary"
              size="lg"
              disabled={
                isProcessing ||
                (paymentAmount <= 0 && !(paymentMode === 'items' && selectedTotal > 0)) ||
                tendered > 0
              }
              onClick={() => handlePayment('CARD')}
            >
              <CreditCard className="w-5 h-5 text-blue-500" />
              {paymentMode === 'items' && paymentAmount === 0 && selectedTotal > 0
                ? 'KART (0 TL)'
                : 'KART İLE ÖDE'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
