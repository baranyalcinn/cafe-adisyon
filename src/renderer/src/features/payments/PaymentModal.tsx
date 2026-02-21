// src/features/payments/PaymentModal.tsx
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Banknote, Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import { PremiumAmount } from '@/components/PremiumAmount'
import { Button } from '@/components/ui/button'
import { type Order, type PaymentMethod } from '@/lib/api'
import { soundManager } from '@/lib/sound'
import { cn, formatCurrency } from '@/lib/utils'
import { useTableStore } from '@/store/useTableStore'

import { ItemRow } from './components/ItemRow'
import { Numpad } from './components/Numpad'
import { PaymentActions } from './components/PaymentActions'
import { ResultBanner } from './components/ResultBanner'
import { SuccessView } from './components/SuccessView'

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
  isProcessing: boolean
  finalChange: number
  splitCount: number
  splitIndex: number // 0-based: which person's share we're collecting
}

type Action =
  | { type: 'RESET_ON_OPEN' }
  | { type: 'RESET_TRANSIENT' }
  | { type: 'SET_MODE'; mode: PaymentMode }
  | { type: 'SET_SPLIT'; value: number }
  | { type: 'SET_SPLIT_INDEX'; value: number }
  | { type: 'NEXT_SPLIT_PERSON' }
  | { type: 'SET_TENDERED_INPUT'; value: string }
  | { type: 'CLEAR_TENDERED' }
  | { type: 'SET_PROCESSING'; value: boolean }
  | { type: 'SET_SUCCESS'; finalChange: number }
  | { type: 'SET_VIEW'; view: ViewState }
  | { type: 'SET_SELECTED_QTY'; itemId: string; qty: number }
  | { type: 'CLEAR_SELECTED' }
  | { type: 'SELECT_ALL'; all: Record<string, number> }

const initialState: State = {
  view: 'PAY',
  paymentMode: 'full',
  selectedQuantities: {},
  tenderedInput: '',
  isProcessing: false,
  finalChange: 0,
  splitCount: 2,
  splitIndex: 0
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
        isProcessing: false,
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
        splitIndex: action.mode === 'split' ? 0 : state.splitIndex
      }
    case 'SET_SPLIT':
      return { ...state, splitCount: action.value, splitIndex: 0 }
    case 'SET_SPLIT_INDEX':
      return { ...state, splitIndex: action.value }
    case 'NEXT_SPLIT_PERSON':
      return { ...state, splitIndex: state.splitIndex + 1, tenderedInput: '' }
    case 'SET_TENDERED_INPUT':
      return { ...state, tenderedInput: action.value }
    case 'CLEAR_TENDERED':
      return { ...state, tenderedInput: '' }
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.value }
    case 'SET_SUCCESS':
      return { ...state, view: 'SUCCESS', isProcessing: false, finalChange: action.finalChange }
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
    default:
      return state
  }
}

/**
 * Parses a money input like "12", "12.3", "12,30" to cents (integer).
 * Returns 0 for empty/invalid.
 */
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

/**
 * Cents (int) -> input string "12.30"
 */
function centsToInputString(cents: number): string {
  const safe = Math.max(0, Math.trunc(cents))
  const whole = Math.floor(safe / 100)
  const frac = safe % 100
  return `${whole}.${String(frac).padStart(2, '0')}`
}

/**
 * Normalizes tendered input live:
 * - only digits + one dot
 * - max 2 decimals
 * - allows empty
 */
function normalizeTenderedInput(nextRaw: string): string {
  if (nextRaw === '') return ''
  const normalized = nextRaw.replace(',', '.')
  if (!/^[0-9.]*$/.test(normalized)) return ''
  if ((normalized.match(/\./g) || []).length > 1) return ''
  if (normalized.includes('.') && normalized.split('.')[1].length > 2) return ''
  return normalized
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

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
    const base = Math.floor(remainingAmount / n)
    const remainder = remainingAmount % n

    const idx = clamp(state.splitIndex, 0, Math.max(0, n - 1))
    const share = base + (idx < remainder ? 1 : 0)

    return { n, base, remainder, share, idx }
  }, [remainingAmount, state.splitCount, state.splitIndex])

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
    state.paymentMode === 'items' &&
    isItemsModeWithSelection &&
    tendered > 0 &&
    tendered < effectivePayment

  const canProceedBase =
    effectivePayment > 0 || (state.paymentMode === 'items' && selectedTotal > 0)

  const canCashPay = !state.isProcessing && canProceedBase && !itemsPartialBlocked
  const canCardPay = !state.isProcessing && canProceedBase && tendered <= effectivePayment

  // --- Effects ---

  useEffect(() => {
    if (!open) return
    dispatch({ type: 'RESET_ON_OPEN' })
    const t = setTimeout(() => {
      tenderedInputRef.current?.focus()
    }, 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

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

  const setQty = useCallback((itemId: string, qty: number): void => {
    dispatch({ type: 'SET_SELECTED_QTY', itemId, qty })
  }, [])

  const selectAllItems = useCallback((): void => {
    const all: Record<string, number> = {}
    unpaidItems.forEach((item) => {
      all[item.id] = item.quantity
    })
    dispatch({ type: 'SELECT_ALL', all })
  }, [unpaidItems])

  const handleSetExact = useCallback((): void => {
    dispatch({ type: 'SET_TENDERED_INPUT', value: centsToInputString(effectivePayment) })
  }, [effectivePayment])

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
        if (canCashPay) void handlePayment('CASH')
      }
    },
    [state.view, state.tenderedInput, canCashPay, appendTendered, backspaceTendered, clearTendered]
  )

  const handlePayment = useCallback(
    async (method: PaymentMethod): Promise<void> => {
      let actualAmount = effectivePayment

      // Items mode: avoid logical inconsistency (items marked paid while amount partial).
      if (state.paymentMode === 'items' && isItemsModeWithSelection) {
        if (tendered > 0 && tendered < effectivePayment) return
        actualAmount = effectivePayment
      } else {
        // Full/Split: allow partial pay if tendered typed and less than due.
        if (tendered > 0 && tendered < effectivePayment) actualAmount = tendered
      }

      if (actualAmount <= 0 && !(state.paymentMode === 'items' && selectedTotal > 0)) return

      dispatch({ type: 'SET_PROCESSING', value: true })

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
        const shouldClose = newRemaining <= 1 // 1 cent tolerance

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

        // Split: move to next person share (keeps user in flow)
        if (state.paymentMode === 'split') {
          dispatch({ type: 'NEXT_SPLIT_PERSON' })
        }

        dispatch({ type: 'SET_PROCESSING', value: false })
        tenderedInputRef.current?.focus()
      } catch (error) {
        console.error('Payment failed:', error)
        dispatch({ type: 'SET_PROCESSING', value: false })
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

  const handleClose = useCallback((): void => {
    if (state.view === 'SUCCESS') {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (onPaymentComplete) onPaymentComplete()
      else selectTable(null, null)
    }
    dispatch({ type: 'RESET_TRANSIENT' })
    onClose()
  }, [state.view, onPaymentComplete, selectTable, onClose])

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean): void => {
      if (!nextOpen) handleClose()
    },
    [handleClose]
  )

  // --- Render ---

  if (state.view === 'SUCCESS') {
    return (
      <SuccessView
        open={open}
        finalChange={state.finalChange}
        onOpenChange={handleDialogOpenChange}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange} key="payment-modal">
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
          <div className="p-7 pb-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-baseline gap-3">
                <DialogTitle className="text-[22px] font-semibold tracking-tight text-foreground">
                  Hesap Özeti
                </DialogTitle>

                <div className="flex items-center gap-2 text-muted-foreground/60">
                  <span className="text-[14px] font-medium">•</span>
                  <span className="text-[12px] font-semibold tracking-wide">
                    {tableName || order?.table?.name || '---'}
                  </span>
                </div>
              </div>
            </div>

            {/* Balances */}
            <div className="space-y-3 mb-6">
              <div className="rounded-2xl border border-border/40 bg-muted/10 shadow-sm px-6 py-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col items-start gap-1.5 px-1 flex-1">
                    <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                      Kalan Tutar
                    </span>
                    <PremiumAmount amount={remainingAmount} size="3xl" color="primary" />
                  </div>

                  {paidAmount > 0 && (
                    <div className="flex flex-col items-end gap-1.5 px-1 flex-1 animate-in fade-in duration-200">
                      <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                        Ödenen
                      </span>
                      <PremiumAmount amount={paidAmount} size="2xl" color="success" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex p-1 bg-muted/30 rounded-2xl gap-1 border border-border/40">
              {[
                { id: 'full', label: 'Tümü' },
                { id: 'split', label: 'Bölüştür' },
                { id: 'items', label: 'Ürün Seç' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => dispatch({ type: 'SET_MODE', mode: mode.id as PaymentMode })}
                  className={cn(
                    'flex-1 h-9 rounded-xl text-[12px] font-semibold transition',
                    state.paymentMode === mode.id
                      ? 'bg-background text-foreground border border-border/40 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Specific */}
          <div className="flex-1 overflow-auto px-7 pb-7 scrollbar-hide">
            {state.paymentMode === 'full' && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-6 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Banknote className="w-7 h-7 text-primary/70" />
                </div>
                <div className="space-y-1">
                  <p className="text-[14px] font-semibold text-foreground">Hızlı Hesap Kapama</p>
                  <p className="text-[12px] text-muted-foreground">Tüm bakiyeye odaklanıldı</p>
                </div>
              </div>
            )}

            {state.paymentMode === 'split' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                      Kişi Sayısı
                    </span>
                    <span className="text-sm font-semibold text-foreground">{split.n} kişi</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-xl bg-background border-border/40"
                      onClick={() =>
                        dispatch({ type: 'SET_SPLIT', value: clamp(split.n - 1, 2, 20) })
                      }
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-xl bg-background border-border/40"
                      onClick={() =>
                        dispatch({ type: 'SET_SPLIT', value: clamp(split.n + 1, 2, 20) })
                      }
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4, 5].map((n) => (
                      <Button
                        key={n}
                        variant={split.n === n ? 'default' : 'outline'}
                        className={cn(
                          'h-11 rounded-xl text-[12px] font-semibold',
                          split.n === n
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-background border-border/40'
                        )}
                        onClick={() => dispatch({ type: 'SET_SPLIT', value: n })}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background shadow-sm p-6 text-center">
                  <p className="text-[11px] font-semibold text-muted-foreground tracking-wide mb-2">
                    Kişi Başı — {split.idx + 1}/{split.n}
                  </p>

                  <PremiumAmount amount={split.share} size="2xl" color="primary" />

                  {split.remainder > 0 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      İlk {split.remainder} kişi +₺0,01
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl bg-background border-border/40"
                      onClick={() => dispatch({ type: 'SET_SPLIT_INDEX', value: 0 })}
                    >
                      Sıfırla
                    </Button>
                    <Button
                      className="h-11 rounded-xl"
                      onClick={() => dispatch({ type: 'NEXT_SPLIT_PERSON' })}
                      disabled={split.idx >= split.n - 1}
                      title={split.idx >= split.n - 1 ? 'Son kişi' : undefined}
                    >
                      Sonraki Kişi
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {state.paymentMode === 'items' && (
              <div className="h-full flex flex-col animate-in fade-in duration-200 overflow-hidden">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                    Ürün Listesi
                  </span>
                  <button
                    onClick={() => {
                      if (isAllItemsSelected) dispatch({ type: 'CLEAR_SELECTED' })
                      else selectAllItems()
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline"
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
                      onQtyChange={setQty}
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
              {/* Total */}
              <div className="flex-[1.6]">
                <div
                  className={cn(
                    'h-full rounded-2xl border border-border/40 bg-background shadow-sm',
                    'px-6 py-4 flex flex-col items-center justify-center'
                  )}
                >
                  <span className="text-[11px] font-semibold text-muted-foreground tracking-wide mb-1">
                    Toplam Tutar
                  </span>
                  <PremiumAmount amount={effectivePayment} size="4xl" color="primary" />
                </div>
              </div>

              {/* Tendered */}
              <div className="flex-1">
                <div
                  className={cn(
                    'h-full rounded-2xl border border-border/40 bg-background shadow-sm',
                    'px-6 py-4 flex flex-col justify-between',
                    'focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10'
                  )}
                >
                  {/* Accessible / focusable input (keyboard scope) */}
                  <input
                    ref={tenderedInputRef}
                    value={state.tenderedInput}
                    onKeyDown={handleTenderedKeyDown}
                    onChange={() => {
                      /* readOnly behavior via controlled keypad */
                    }}
                    inputMode="decimal"
                    aria-label="Alınan para"
                    className="sr-only"
                    readOnly
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                      Alınan Para
                    </span>

                    <button
                      onClick={clearTendered}
                      className={cn(
                        'h-9 w-9 inline-flex items-center justify-center rounded-xl',
                        'border border-border/40 bg-background',
                        'text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5',
                        'transition active:scale-[0.99]'
                      )}
                      title="Sıfırla (Delete)"
                      aria-label="Sıfırla"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>

                  <button
                    className={cn(
                      'mt-2 w-full text-right rounded-xl',
                      'px-2 py-2',
                      'hover:bg-muted/40 transition active:scale-[0.99]'
                    )}
                    onClick={() => tenderedInputRef.current?.focus()}
                    type="button"
                    aria-label="Alınan para alanına odaklan"
                    title="Klavye girişi için tıklayın"
                  >
                    <span
                      className={cn(
                        'font-mono tabular-nums tracking-tight',
                        'text-3xl font-semibold',
                        state.tenderedInput ? 'text-foreground' : 'text-muted-foreground/40'
                      )}
                    >
                      {state.tenderedInput ? formatCurrency(tendered) : '₺ 0,00'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="w-full max-w-[640px] h-[72px] mb-2 px-1 flex items-center">
              <ResultBanner
                itemsPartialBlocked={itemsPartialBlocked}
                tendered={tendered}
                effectivePayment={effectivePayment}
                currentChange={currentChange}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="mt-auto p-8 pt-0 flex flex-col gap-4 w-full max-w-[560px] mx-auto">
            <Numpad
              onAppend={appendTendered}
              onBackspace={backspaceTendered}
              onQuickCash={handleTenderedChange}
              onSetExact={handleSetExact}
            />

            {/* Actions */}
            <PaymentActions
              canCashPay={canCashPay}
              canCardPay={canCardPay}
              onPayment={handlePayment}
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
