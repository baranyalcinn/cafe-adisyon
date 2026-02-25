// src/features/payments/PaymentModal.tsx
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Banknote, ListChecks, Minus, Plus, RotateCcw, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import { PremiumAmount } from '@/components/PremiumAmount'
import { Button } from '@/components/ui/button'
import { type Order, type PaymentMethod } from '@/lib/api'
import { soundManager } from '@/lib/sound'
import { cn, formatCurrency } from '@/lib/utils'
import { useTableStore } from '@/store/useTableStore'
import { toast } from '@/store/useToastStore'

import { ItemRow } from './components/ItemRow'
import { Numpad } from './components/Numpad'
import { PaymentActions } from './components/PaymentActions'
import { ResultBanner } from './components/ResultBanner'
import { SuccessView } from './components/SuccessView'

// ============================================================================
// Types
// ============================================================================

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
type ViewState = 'PAY' | 'SUCCESS'

type State = {
  view: ViewState
  paymentMode: PaymentMode
  selectedQuantities: Record<string, number>
  tenderedInput: string
  processingMethod: PaymentMethod | null
  finalChange: number
  splitCount: number
  splitIndex: number
  splitBaseAmount: number
  hoveredPaymentMethod: PaymentMethod | null
}

type Action =
  | { type: 'RESET_ON_OPEN' }
  | { type: 'RESET_TRANSIENT' }
  | { type: 'SET_MODE'; mode: PaymentMode }
  | { type: 'SET_SPLIT'; value: number }
  | { type: 'SET_SPLIT_INDEX'; value: number }
  | { type: 'NEXT_SPLIT_PERSON' }
  | { type: 'SET_SPLIT_BASE'; value: number }
  | { type: 'SET_TENDERED_INPUT'; value: string }
  | { type: 'CLEAR_TENDERED' }
  | { type: 'SET_PROCESSING'; method: PaymentMethod | null }
  | { type: 'SET_SUCCESS'; finalChange: number }
  | { type: 'SET_VIEW'; view: ViewState }
  | { type: 'SET_SELECTED_QTY'; itemId: string; qty: number }
  | { type: 'CLEAR_SELECTED' }
  | { type: 'SELECT_ALL'; all: Record<string, number> }
  | { type: 'SET_HOVER_PAYMENT'; method: PaymentMethod | null }

// ============================================================================
// Constants & Pure Functions
// ============================================================================

const PAYMENT_MODES = [
  { id: 'full', label: 'Tamamı', Icon: Banknote },
  { id: 'split', label: 'Bölüştür', Icon: Users },
  { id: 'items', label: 'Ürün Seç', Icon: ListChecks }
] as const

const SPLIT_QUICK_OPTIONS = [2, 3, 4, 5] as const

const initialState: State = {
  view: 'PAY',
  paymentMode: 'full',
  selectedQuantities: {},
  tenderedInput: '',
  processingMethod: null,
  finalChange: 0,
  splitCount: 2,
  splitIndex: 0,
  splitBaseAmount: 0,
  hoveredPaymentMethod: null
}

function parseMoneyToCents(input: string): number {
  const trimmed = input.trim()
  if (!trimmed) return 0
  const normalized = trimmed.replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return 0

  const [wholeStr, fracStr = ''] = normalized.split('.')
  const whole = Number(wholeStr)
  const frac = Number((fracStr + '00').slice(0, 2))
  if (!Number.isFinite(whole) || !Number.isFinite(frac)) return 0
  return whole * 100 + frac
}

function centsToInputString(cents: number): string {
  const safe = Math.max(0, Math.trunc(cents))
  const whole = Math.floor(safe / 100)
  const frac = safe % 100
  return `${whole}.${String(frac).padStart(2, '0')}`
}

function normalizeTenderedInput(nextRaw: string): string {
  if (nextRaw === '') return ''
  const normalized = nextRaw.replace(',', '.')
  if (!/^[0-9.]*$/.test(normalized)) return ''
  if ((normalized.match(/\./g) || []).length > 1) return ''
  if (normalized.includes('.') && normalized.split('.')[1].length > 2) return ''

  const numericVal = parseFloat(normalized)
  if (!isNaN(numericVal) && numericVal > 9999) return ''
  return normalized
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'RESET_ON_OPEN':
      return { ...initialState }
    case 'RESET_TRANSIENT':
      return {
        ...state,
        view: 'PAY',
        tenderedInput: '',
        processingMethod: null,
        finalChange: 0,
        selectedQuantities: {},
        splitIndex: 0
      }
    case 'SET_MODE':
      return {
        ...state,
        paymentMode: action.mode,
        tenderedInput: '',
        selectedQuantities: action.mode === 'items' ? state.selectedQuantities : {},
        splitIndex: action.mode === 'split' ? 0 : state.splitIndex,
        splitBaseAmount: action.mode === 'split' ? 0 : state.splitBaseAmount
      }
    case 'SET_SPLIT':
      return { ...state, splitCount: action.value, splitIndex: 0 }
    case 'SET_SPLIT_INDEX':
      return { ...state, splitIndex: action.value }
    case 'NEXT_SPLIT_PERSON':
      return { ...state, splitIndex: state.splitIndex + 1, tenderedInput: '' }
    case 'SET_SPLIT_BASE':
      return { ...state, splitBaseAmount: action.value }
    case 'SET_TENDERED_INPUT':
      return { ...state, tenderedInput: action.value }
    case 'CLEAR_TENDERED':
      return { ...state, tenderedInput: '' }
    case 'SET_PROCESSING':
      return { ...state, processingMethod: action.method }
    case 'SET_SUCCESS':
      return { ...state, view: 'SUCCESS', processingMethod: null, finalChange: action.finalChange }
    case 'SET_VIEW':
      return { ...state, view: action.view }
    case 'SET_SELECTED_QTY': {
      const next = { ...state.selectedQuantities }
      if (action.qty <= 0) delete next[action.itemId]
      else next[action.itemId] = action.qty
      return { ...state, selectedQuantities: next }
    }
    case 'CLEAR_SELECTED':
      return { ...state, selectedQuantities: {} }
    case 'SELECT_ALL':
      return { ...state, selectedQuantities: action.all }
    case 'SET_HOVER_PAYMENT':
      return { ...state, hoveredPaymentMethod: action.method }
    default:
      return state
  }
}

// ============================================================================
// Component
// ============================================================================

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
  const [state, dispatch] = useReducer(reducer, initialState)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const tenderedInputRef = useRef<HTMLInputElement | null>(null)

  // -- Derived State --
  const total = order?.totalAmount || 0
  const paidAmount = order?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remainingAmount = total - paidAmount

  const unpaidItems = useMemo(
    () => order?.items?.filter((item) => !item.isPaid) || [],
    [order?.items]
  )

  const selectedTotal = useMemo(() => {
    return unpaidItems.reduce((sum, item) => {
      const qty = state.selectedQuantities[item.id] || 0
      return sum + qty * item.unitPrice
    }, 0)
  }, [unpaidItems, state.selectedQuantities])

  const isAllItemsSelected = useMemo(() => {
    if (unpaidItems.length === 0) return false
    return unpaidItems.every((item) => (state.selectedQuantities[item.id] || 0) === item.quantity)
  }, [unpaidItems, state.selectedQuantities])

  const split = useMemo(() => {
    const n = clamp(state.splitCount, 2, 20)
    const idx = clamp(state.splitIndex, 0, Math.max(0, n - 1))
    const originalAmount = state.splitBaseAmount > 0 ? state.splitBaseAmount : remainingAmount
    const base = Math.floor(originalAmount / n)
    const remainder = originalAmount % n
    const share = base + (idx < remainder ? 1 : 0)

    return { n, base, remainder, share, idx }
  }, [remainingAmount, state.splitCount, state.splitIndex, state.splitBaseAmount])

  const paymentAmount = useMemo(() => {
    switch (state.paymentMode) {
      case 'full':
        return remainingAmount
      case 'items':
        return selectedTotal
      case 'split':
        return split.share
      default:
        return 0
    }
  }, [remainingAmount, selectedTotal, split.share, state.paymentMode])

  const effectivePayment = Math.min(paymentAmount, remainingAmount)
  const tendered = parseMoneyToCents(state.tenderedInput)
  const currentChange = Math.max(0, tendered - effectivePayment)

  const isItemsModeWithSelection =
    state.paymentMode === 'items' && Object.keys(state.selectedQuantities).length > 0
  const itemsPartialBlocked =
    isItemsModeWithSelection && tendered > 0 && tendered < effectivePayment
  const canProceedBase =
    effectivePayment > 0 || (state.paymentMode === 'items' && selectedTotal > 0)
  const canCashPay = state.processingMethod === null && canProceedBase && !itemsPartialBlocked
  const canCardPay = canCashPay && tendered <= effectivePayment

  // --- Effects ---

  // Tekleştirilmiş Input Odaklama Efekti (Açılış ve İşlem Sonrası)
  useEffect(() => {
    if (!open) return

    // Sadece open değiştiğinde resetle
    if (state.view === 'SUCCESS') return

    const t = setTimeout(() => {
      tenderedInputRef.current?.focus()
    }, 50)
    return () => clearTimeout(t)
  }, [open, state.paymentMode, state.selectedQuantities, state.splitIndex])

  // Dialog açılış temizliği
  useEffect(() => {
    if (open) dispatch({ type: 'RESET_ON_OPEN' })
  }, [open])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (state.paymentMode === 'split' && state.splitBaseAmount === 0 && remainingAmount > 0) {
      dispatch({ type: 'SET_SPLIT_BASE', value: remainingAmount })
    }
  }, [state.paymentMode, state.splitBaseAmount, remainingAmount])

  // --- Callbacks ---

  const handleTenderedChange = useCallback((raw: string): void => {
    const normalized = normalizeTenderedInput(raw)
    if (normalized === '' && raw !== '') return
    dispatch({ type: 'SET_TENDERED_INPUT', value: normalized })
  }, [])

  const appendTendered = useCallback(
    (chunk: string): void => {
      handleTenderedChange(state.tenderedInput + chunk)
      tenderedInputRef.current?.focus()
    },
    [state.tenderedInput, handleTenderedChange]
  )

  const backspaceTendered = useCallback((): void => {
    handleTenderedChange(state.tenderedInput.slice(0, -1))
    tenderedInputRef.current?.focus()
  }, [state.tenderedInput, handleTenderedChange])

  const clearTendered = useCallback((): void => {
    dispatch({ type: 'CLEAR_TENDERED' })
    tenderedInputRef.current?.focus()
  }, [])

  const handleSetExact = useCallback((): void => {
    dispatch({ type: 'SET_TENDERED_INPUT', value: centsToInputString(effectivePayment) })
  }, [effectivePayment])

  const handlePaymentRef = useRef<(method: PaymentMethod) => void>(() => {})

  const handleTenderedKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (state.view === 'SUCCESS') return

      const key = e.key
      if (/^[0-9]$/.test(key)) {
        e.preventDefault()
        appendTendered(key)
        return
      }
      if (key === '.' || key === ',') {
        e.preventDefault()
        if (!state.tenderedInput.includes('.')) appendTendered('.')
        return
      }
      if (key === 'Backspace') {
        e.preventDefault()
        backspaceTendered()
        return
      }
      if (key === 'Delete') {
        e.preventDefault()
        clearTendered()
        return
      }
      if (key === 'Enter') {
        e.preventDefault()
        if (canCashPay && state.tenderedInput.trim() !== '') {
          void handlePaymentRef.current('CASH')
        }
      }
    },
    [state.view, state.tenderedInput, canCashPay, appendTendered, backspaceTendered, clearTendered]
  )

  const handlePayment = useCallback(
    async (method: PaymentMethod): Promise<void> => {
      if (state.processingMethod !== null) return

      let actualAmount = effectivePayment

      if (state.paymentMode === 'items' && isItemsModeWithSelection) {
        if (tendered > 0 && tendered < effectivePayment) return
        actualAmount = effectivePayment
      } else {
        if (tendered > 0 && tendered < effectivePayment) actualAmount = tendered
      }

      if (actualAmount <= 0 && !(state.paymentMode === 'items' && selectedTotal > 0)) return

      dispatch({ type: 'SET_PROCESSING', method })

      try {
        const finalChange = method === 'CASH' ? currentChange : 0

        if (actualAmount > 0) {
          await onProcessPayment(actualAmount, method, { skipLog: isItemsModeWithSelection })
        }

        if (isItemsModeWithSelection) {
          const itemsToPay = Object.entries(state.selectedQuantities).map(([id, quantity]) => ({
            id,
            quantity
          }))
          const paymentDetails = actualAmount > 0 ? { amount: actualAmount, method } : undefined
          await onMarkItemsPaid(itemsToPay, paymentDetails)
        }

        const newRemaining = remainingAmount - actualAmount
        const shouldClose = newRemaining <= 1

        soundManager.playSuccess()
        dispatch({ type: 'CLEAR_TENDERED' })
        dispatch({ type: 'CLEAR_SELECTED' })

        if (shouldClose) {
          dispatch({ type: 'SET_SUCCESS', finalChange })
          timerRef.current = setTimeout(() => {
            onClose()
            if (onPaymentComplete) onPaymentComplete()
            else selectTable(null, null)
          }, 3000)
          return
        }

        if (state.paymentMode === 'split') {
          dispatch({ type: 'NEXT_SPLIT_PERSON' })
        }

        dispatch({ type: 'SET_PROCESSING', method: null })
        tenderedInputRef.current?.focus()
      } catch (error) {
        console.error('Payment failed:', error)
        toast({
          title: 'Ödeme başarısız',
          description: 'Lütfen tekrar deneyin.',
          variant: 'destructive'
        })
        dispatch({ type: 'SET_PROCESSING', method: null })
        tenderedInputRef.current?.focus()
      }
    },
    [
      effectivePayment,
      state.paymentMode,
      state.selectedQuantities,
      isItemsModeWithSelection,
      tendered,
      selectedTotal,
      currentChange,
      remainingAmount,
      onProcessPayment,
      onMarkItemsPaid,
      onClose,
      onPaymentComplete,
      selectTable
    ]
  )

  handlePaymentRef.current = handlePayment

  const handleClose = useCallback((): void => {
    if (state.view === 'SUCCESS') {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (onPaymentComplete) onPaymentComplete()
      else selectTable(null, null)
    }
    dispatch({ type: 'RESET_TRANSIENT' })
    onClose()
  }, [state.view, onPaymentComplete, selectTable, onClose])

  // --- Render ---

  if (state.view === 'SUCCESS') {
    return (
      <SuccessView
        open={open}
        finalChange={state.finalChange}
        onOpenChange={(nextOpen) => !nextOpen && handleClose()}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()} key="payment-modal">
      <DialogContent
        ref={contentRef}
        tabIndex={-1}
        className={cn(
          'sm:max-w-5xl p-0 gap-0 overflow-hidden h-[680px] flex flex-col md:flex-row',
          'rounded-2xl border border-border/40 shadow-lg bg-background',
          '[&>button]:hidden outline-none'
        )}
      >
        {/* LEFT PANEL */}
        <div className="w-[480px] flex flex-col border-r border-border/40 bg-background h-full">
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline gap-3">
                <DialogTitle className="text-[22px] font-semibold tracking-tight text-foreground">
                  Hesap Özeti
                </DialogTitle>

                <div className="flex items-center gap-2 text-foreground/80">
                  <span className="text-[14px] font-bold opacity-30">|</span>
                  <span className="text-[14px] font-black tracking-tight">
                    {tableName || order?.table?.name || '---'}
                  </span>
                </div>
              </div>
            </div>

            {/* Balances */}
            <div className="space-y-2 mb-3">
              <div className="rounded-2xl border border-border/40 bg-muted/10 shadow-sm px-6 py-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col items-start gap-1.5 px-1 flex-1">
                    <span className="text-[11px] font-bold text-foreground/70 tracking-wide">
                      Kalan Tutar
                    </span>
                    <PremiumAmount amount={remainingAmount} size="3xl" color="primary" />
                  </div>

                  {paidAmount > 0 && (
                    <div className="flex flex-col items-end gap-1.5 px-1 flex-1 animate-in fade-in duration-200">
                      <span className="text-[11px] font-bold text-foreground/70 tracking-wide">
                        Ödenen
                      </span>
                      <PremiumAmount amount={paidAmount} size="2xl" color="success" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2 mb-2">
              {PAYMENT_MODES.map(({ id, label, Icon }) => {
                const isActive = state.paymentMode === id

                return (
                  <button
                    key={id}
                    onClick={() => dispatch({ type: 'SET_MODE', mode: id })}
                    className={cn(
                      'flex-1 h-12 flex items-center justify-center gap-2 rounded-xl transition-all duration-200 border',
                      isActive
                        ? 'bg-primary border-primary text-primary-foreground shadow-md'
                        : 'bg-background border-border/40 text-foreground/90 hover:bg-muted/30 hover:text-foreground'
                    )}
                  >
                    <div className="shrink-0 flex items-center">
                      <Icon
                        className={cn(
                          'w-[18px] h-[18px]',
                          isActive ? 'text-primary-foreground' : 'text-foreground/60'
                        )}
                      />
                    </div>
                    <span className="text-[13px] font-extrabold tracking-tight whitespace-nowrap">
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mode Specific Body */}
          <div className="flex-1 overflow-auto px-7 pb-7 scrollbar-hide">
            {/* FULL MODE */}
            {state.paymentMode === 'full' && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-6 animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/5">
                  <Banknote className="w-8 h-8 text-primary/70" />
                </div>
                <div className="space-y-1">
                  <p className="text-[19px] font-semibold text-foreground">Hızlı Hesap Kapama</p>
                  <p className="text-[14px] font-medium text-foreground/70">
                    Tüm bakiyeye odaklanıldı
                  </p>
                </div>
              </div>
            )}

            {/* SPLIT MODE */}
            {state.paymentMode === 'split' && (
              <div className="space-y-6 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-muted/10 rounded-2xl border border-border/10 p-4">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-foreground/90 px-1">
                        Kişi Sayısı
                      </span>
                      <div className="flex items-center bg-background rounded-xl border border-border/20 p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-lg hover:bg-muted/50"
                          onClick={() =>
                            dispatch({ type: 'SET_SPLIT', value: clamp(split.n - 1, 2, 20) })
                          }
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <div className="w-10 text-center">
                          <span className="text-base font-bold tabular-nums">{split.n}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-lg hover:bg-muted/50"
                          onClick={() =>
                            dispatch({ type: 'SET_SPLIT', value: clamp(split.n + 1, 2, 20) })
                          }
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="h-10 w-[1px] bg-border/40 mt-5" />

                    <div className="flex flex-col gap-1.5 flex-1">
                      <span className="text-[11px] font-bold text-foreground/90 text-right px-1">
                        Hızlı Seçim
                      </span>
                      <div className="flex items-center justify-end gap-1.5">
                        {SPLIT_QUICK_OPTIONS.map((n) => (
                          <button
                            key={n}
                            onClick={() => dispatch({ type: 'SET_SPLIT', value: n })}
                            className={cn(
                              'w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all',
                              split.n === n
                                ? 'bg-primary text-primary-foreground shadow-md scale-105'
                                : 'text-foreground/70 bg-background border border-border/40 hover:bg-muted/50 hover:text-foreground'
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card & Status Area */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center gap-1.5">
                      {Array.from({ length: split.n }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1.5 rounded-full transition-all duration-300',
                            i === split.idx ? 'w-5 bg-primary' : 'w-1.5 bg-foreground/20'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-foreground/90">
                      {split.idx + 1}. Kişi Payı
                    </span>
                  </div>

                  <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-background shadow-sm p-6 flex flex-col items-center justify-center">
                    <div className="mb-6">
                      <PremiumAmount amount={split.share} size="3xl" color="primary" />
                    </div>

                    {split.remainder > 0 && split.idx < split.remainder && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-amber-100/40 text-amber-700/80 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200/30">
                          +0.01 Yuvarlama
                        </div>
                      </div>
                    )}

                    <div className="w-full grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="h-11 rounded-2xl bg-background border-border/40 font-bold text-[12px] text-foreground/80 hover:bg-muted/50 transition-all"
                        onClick={() => dispatch({ type: 'SET_SPLIT_INDEX', value: 0 })}
                      >
                        Sıfırla
                      </Button>
                      <Button
                        className="h-11 rounded-2xl font-bold text-[12px] tracking-wide"
                        onClick={() => dispatch({ type: 'NEXT_SPLIT_PERSON' })}
                        disabled={split.idx >= split.n - 1}
                      >
                        {split.idx >= split.n - 1 ? 'Bitti' : 'Sonraki Kişi'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ITEMS MODE */}
            {state.paymentMode === 'items' && (
              <div className="h-full flex flex-col animate-in fade-in duration-200 overflow-hidden">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[12px] font-bold text-foreground/80 tracking-wide">
                    Ürün Listesi
                  </span>
                  <button
                    onClick={() => {
                      if (isAllItemsSelected) dispatch({ type: 'CLEAR_SELECTED' })
                      else {
                        const all: Record<string, number> = {}
                        unpaidItems.forEach((i) => {
                          all[i.id] = i.quantity
                        })
                        dispatch({ type: 'SELECT_ALL', all })
                      }
                    }}
                    className={cn(
                      'text-[12px] font-bold transition-colors',
                      isAllItemsSelected
                        ? 'text-foreground/60 hover:text-destructive'
                        : 'text-primary hover:text-primary/80'
                    )}
                  >
                    {isAllItemsSelected ? 'Tümünü İptal Et' : 'Tümünü Seç'}
                  </button>
                </div>

                <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 pb-4 custom-scrollbar">
                  {unpaidItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      selected={state.selectedQuantities[item.id] || 0}
                      onQtyChange={(itemId, qty) =>
                        dispatch({ type: 'SET_SELECTED_QTY', itemId, qty })
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col bg-muted/5 relative h-full overflow-hidden">
          <div className="px-8 pt-4 pb-2 flex flex-col items-center">
            <div className="flex gap-4 w-full max-w-[640px] mb-8">
              {/* Total Amount */}
              <div className="flex-[1.6]">
                <div
                  className={cn(
                    'h-full rounded-2xl border border-border/40 bg-background shadow-sm px-6 py-4 flex flex-col items-center justify-center'
                  )}
                >
                  <span className="text-[13px] font-semibold text-foreground/90 tracking-wide mb-1">
                    Toplam Tutar
                  </span>
                  <PremiumAmount amount={effectivePayment} size="4xl" color="primary" />
                </div>
              </div>

              {/* Tendered Input Area */}
              <div className="flex-1">
                <div
                  className={cn(
                    'h-full rounded-2xl border border-border/40 bg-background shadow-sm px-6 py-4 flex flex-col justify-between',
                    'focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10'
                  )}
                >
                  <input
                    ref={tenderedInputRef}
                    value={state.tenderedInput}
                    onKeyDown={handleTenderedKeyDown}
                    onChange={() => {}}
                    inputMode="decimal"
                    aria-label="Alınan para"
                    className="sr-only"
                    readOnly
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground/90 tracking-wide">
                      Alınacak
                    </span>
                    <button
                      onClick={clearTendered}
                      className={cn(
                        'flex h-11 items-center gap-2 rounded-xl border border-transparent px-4 transition-all',
                        'text-foreground/80 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 active:scale-[0.99]'
                      )}
                      title="Sıfırla (Delete)"
                      aria-label="Sıfırla"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    className="mt-2 w-full text-right rounded-xl px-2 py-2 hover:bg-muted/40 transition active:scale-[0.99]"
                    onClick={() => tenderedInputRef.current?.focus()}
                    type="button"
                    aria-label="Alınacak tutar alanına odaklan"
                  >
                    <span
                      className={cn(
                        'font-sans tabular-nums tracking-tight transition-all duration-300 text-3xl font-bold',
                        state.tenderedInput
                          ? 'text-teal-600 dark:text-teal-500'
                          : state.hoveredPaymentMethod !== null
                            ? 'text-foreground/80 scale-105 inline-block origin-right'
                            : 'text-foreground/30'
                      )}
                    >
                      {state.tenderedInput
                        ? formatCurrency(tendered)
                        : state.hoveredPaymentMethod !== null
                          ? formatCurrency(effectivePayment)
                          : '0 ₺'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Result Banner */}
            <div className="w-full max-w-[640px] min-h-[88px] mb-2 px-1 flex items-center">
              <ResultBanner
                itemsPartialBlocked={itemsPartialBlocked}
                tendered={tendered}
                effectivePayment={effectivePayment}
                currentChange={currentChange}
                hoveredMethod={state.hoveredPaymentMethod}
              />
            </div>
          </div>

          {/* Controls Bottom Area */}
          <div className="mt-auto p-8 pt-0 flex flex-col gap-4 w-full max-w-[560px] mx-auto">
            <Numpad
              onAppend={appendTendered}
              onBackspace={backspaceTendered}
              onQuickCash={handleTenderedChange}
              onSetExact={handleSetExact}
              partialPaymentsBlocked={isItemsModeWithSelection}
              effectivePayment={effectivePayment}
            />

            <PaymentActions
              canCashPay={canCashPay}
              canCardPay={canCardPay}
              processingMethod={state.processingMethod}
              onPayment={handlePayment}
              onHoverChange={(method) => dispatch({ type: 'SET_HOVER_PAYMENT', method })}
              itemsPartialBlocked={itemsPartialBlocked}
              tendered={tendered}
              effectivePayment={effectivePayment}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
