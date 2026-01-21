import { useState, useMemo, useEffect } from 'react'
import { Banknote, CreditCard, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOrderStore } from '@/store/useOrderStore'
import { useTableStore } from '@/store/useTableStore'
import { useCartStore } from '@/store/useCartStore'
import { type PaymentMethod } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'
import { soundManager } from '@/lib/sound'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  onPaymentComplete?: () => void
}

type PaymentMode = 'full' | 'items' | 'custom'

export function PaymentModal({
  open,
  onClose,
  onPaymentComplete
}: Omit<PaymentModalProps, 'order'>): React.JSX.Element {
  const { currentOrder, processPayment, markItemsPaid, loadOrderForTable } = useOrderStore()
  const { selectedTableId, selectTable } = useTableStore()
  const { getTotal } = useCartStore()

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('full')
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})
  const [customAmount, setCustomAmount] = useState('')
  const [tenderedAmount, setTenderedAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [finalChange, setFinalChange] = useState(0)

  const total = getTotal()
  const paidAmount = currentOrder?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remainingAmount = total - paidAmount

  // Filter out paid items for display
  const unpaidItems = useMemo(() => {
    return currentOrder?.items?.filter((item) => !item.isPaid) || []
  }, [currentOrder?.items])

  // Calculate selected items total
  const selectedTotal = useMemo(() => {
    return unpaidItems.reduce((sum, item) => {
      const qty = selectedQuantities[item.id] || 0
      return sum + qty * item.unitPrice
    }, 0)
  }, [unpaidItems, selectedQuantities])

  // Get the payment amount based on mode
  const getPaymentAmount = (): number => {
    switch (paymentMode) {
      case 'full':
        return remainingAmount
      case 'items':
        return selectedTotal
      case 'custom':
        return Math.round((parseFloat(customAmount) || 0) * 100)
      default:
        return 0
    }
  }

  const paymentAmount = getPaymentAmount()
  const tendered = Math.round((parseFloat(tenderedAmount) || 0) * 100)
  const currentChange = Math.max(0, tendered - paymentAmount)

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

  const deselectAllItems = (): void => {
    setSelectedQuantities({})
  }

  const handlePayment = async (method: PaymentMethod): Promise<void> => {
    const amount = getPaymentAmount()
    if (amount <= 0) return

    // Store change before processing payment (as amount will change after success)
    setFinalChange(currentChange)

    setIsProcessing(true)
    const isComplete = await processPayment(amount, method)

    // If in items mode, mark selected items as paid
    if (paymentMode === 'items' && Object.keys(selectedQuantities).length > 0) {
      try {
        const itemsToPay = Object.entries(selectedQuantities).map(([id, quantity]) => ({
          id,
          quantity
        }))
        await markItemsPaid(itemsToPay)
      } catch (error) {
        console.error('Failed to mark items as paid:', error)
      }
    }

    // Force refresh order to ensure UI sync
    if (selectedTableId) {
      await loadOrderForTable(selectedTableId)
    }

    setIsProcessing(false)

    // Wait for success message, then navigate
    setTimeout(() => {
      if (isComplete) {
        soundManager.playSuccess()
        setPaymentComplete(true)
        // Keep success message visible for 3 seconds before navigating
        setTimeout(() => {
          onClose()
          if (onPaymentComplete) {
            onPaymentComplete()
          } else {
            selectTable(null) // Fallback behavior
          }
        }, 3000)
      } else {
        // Partial payment done, reset selection
        if (paymentMode === 'items') {
          setSelectedQuantities({})
        } else if (paymentMode === 'custom') {
          setCustomAmount('')
        }
        setTenderedAmount('')
      }
    }, 100)
  }

  // Handle Enter key for payment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!open || isProcessing || paymentComplete) return

      if (e.key === 'Enter') {
        const amount = getPaymentAmount()
        if (amount > 0) {
          e.preventDefault()
          handlePayment('CASH')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    open,
    isProcessing,
    paymentComplete,
    paymentMode,
    selectedQuantities,
    customAmount,
    getPaymentAmount,
    handlePayment
  ])

  const handleClose = (): void => {
    setPaymentMode('full')
    setSelectedQuantities({})
    setCustomAmount('')
    setTenderedAmount('')
    setPaymentComplete(false)
    onClose()
  }

  if (paymentComplete) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-primary">Ödeme Tamamlandı</h3>
            <p className="text-sm text-muted-foreground mt-1">Masa boşaltıldı</p>
            {finalChange > 0 && (
              <div className="mt-8 relative w-full max-w-[240px] mx-auto group perspective-1000">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity duration-500" />

                {/* Main Card */}
                <div className="relative p-6 bg-card border-2 border-primary/50 shadow-xl shadow-primary/20 rounded-3xl text-center transform transition-all duration-300 hover:scale-105 hover:-translate-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1 block">
                    Para Üstü
                  </span>
                  <p className="text-5xl font-black text-primary tabular-nums tracking-tighter drop-shadow-sm">
                    <span className="text-3xl opacity-50 font-bold mr-1">₺</span>
                    {formatCurrency(finalChange).replace('₺', '')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Ödeme Al</DialogTitle>
          <DialogDescription>
            Tam ödeme, ürün seçerek veya tutar girerek ödeme alın
          </DialogDescription>
        </DialogHeader>

        {/* Payment Mode Tabs */}
        <div className="mt-4 flex gap-2">
          <Button
            variant={paymentMode === 'full' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMode('full')}
            className="flex-1"
          >
            Tam Ödeme
          </Button>
          <Button
            variant={paymentMode === 'items' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMode('items')}
            className="flex-1"
          >
            Ürün Seç
          </Button>
          <Button
            variant={paymentMode === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMode('custom')}
            className="flex-1"
          >
            Tutar Gir
          </Button>
        </div>

        {/* Amount Summary */}
        <div className="mt-4 p-4 rounded-lg bg-muted space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Toplam Tutar</span>
            <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
          </div>
          {paidAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ödenen</span>
              <span className="font-semibold text-emerald-500 tabular-nums">
                {formatCurrency(paidAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t">
            <span className="text-lg font-bold">Ödenecek Tutar</span>
            <span className="text-xl font-bold text-primary tabular-nums">
              {formatCurrency(paymentAmount)}
            </span>
          </div>

          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Verilen (Nakit)
              </label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₺
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(e.target.value)}
                  className="pl-6 h-9"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex-1 text-right">
              <span className="text-xs font-medium text-muted-foreground mb-1 block">
                Para Üstü
              </span>
              <span
                className={cn(
                  'text-xl font-bold tabular-nums',
                  currentChange > 0 ? 'text-amber-500' : ''
                )}
              >
                {formatCurrency(currentChange)}
              </span>
            </div>
          </div>
        </div>

        {/* Full Payment Mode */}
        {paymentMode === 'full' && (
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="flex-col h-auto py-5 gap-2"
              onClick={() => handlePayment('CASH')}
              disabled={isProcessing || remainingAmount <= 0}
            >
              <Banknote className="w-12 h-12 text-emerald-500" />
              <span className="text-lg font-bold">Nakit</span>
              <span className="text-sm font-medium text-muted-foreground">
                {formatCurrency(remainingAmount)}
              </span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-5 gap-2"
              onClick={() => handlePayment('CARD')}
              disabled={isProcessing || remainingAmount <= 0}
            >
              <CreditCard className="w-12 h-12 text-blue-500" />
              <span className="text-lg font-bold">Kart</span>
              <span className="text-sm font-medium text-muted-foreground">
                {formatCurrency(remainingAmount)}
              </span>
            </Button>
          </div>
        )}

        {/* Item Selection Mode */}
        {paymentMode === 'items' && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                Ödenecek ürünleri seçin
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllItems}>
                  Tümünü Seç
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAllItems}>
                  Temizle
                </Button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
              {unpaidItems.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Ödenecek ürün bulunamadı.
                </div>
              ) : (
                unpaidItems.map((item) => {
                  const selectedQty = selectedQuantities[item.id] || 0
                  const isSelected = selectedQty > 0

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border transition-colors',
                        isSelected
                          ? 'bg-primary/5 border-primary shadow-sm'
                          : 'bg-card border-transparent hover:bg-accent/5'
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {item.quantity}x
                        </div>
                        <div>
                          <p className="font-medium">{item.product?.name || 'Ürün'}</p>
                          <p className="text-sm text-muted-foreground tabular-nums">
                            {formatCurrency(item.unitPrice)} / adet
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-md"
                            onClick={() => updateQuantity(item.id, -1, item.quantity)}
                            disabled={!isSelected}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-bold tabular-nums">
                            {selectedQty}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-md"
                            onClick={() => updateQuantity(item.id, 1, item.quantity)}
                            disabled={selectedQty >= item.quantity}
                          >
                            +
                          </Button>
                        </div>

                        <div className="w-20 text-right font-bold tabular-nums">
                          {isSelected ? formatCurrency(selectedQty * item.unitPrice) : '₺0.00'}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Selected Total and Payment Buttons */}
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium">Seçilen Toplam</span>
                <span className="text-xl font-bold text-primary tabular-nums">
                  {formatCurrency(selectedTotal)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handlePayment('CASH')}
                  disabled={isProcessing || selectedTotal <= 0}
                  className="gap-2"
                >
                  <Banknote className="w-4 h-4" />
                  Nakit Al
                </Button>
                <Button
                  onClick={() => handlePayment('CARD')}
                  disabled={isProcessing || selectedTotal <= 0}
                  className="gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Kart Al
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Amount Mode */}
        {paymentMode === 'custom' && (
          <div className="mt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Ödemek istediğiniz tutarı girin
            </p>

            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                ₺
              </span>
              <Input
                type="number"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="pl-8 h-14 text-2xl font-bold text-center"
                min="0"
                max={(remainingAmount / 100).toFixed(2)}
                step="0.01"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[50, 100, 200, remainingAmount / 100].map((amount, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomAmount(amount.toFixed(2))}
                  className="text-sm"
                >
                  {index === 3 ? 'Tamamı' : `₺${amount}`}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handlePayment('CASH')}
                disabled={isProcessing || paymentAmount <= 0}
                className="h-12 gap-2"
              >
                <Banknote className="w-5 h-5" />
                Nakit Al
              </Button>
              <Button
                onClick={() => handlePayment('CARD')}
                disabled={isProcessing || paymentAmount <= 0}
                className="h-12 gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Kart Al
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="mt-5">
          <Button variant="outline" onClick={handleClose}>
            İptal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
