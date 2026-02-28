// src/renderer/src/features/payments/hooks/usePaymentLogic.ts
import { type Order, type PaymentMethod } from '@/lib/api'
import { soundManager } from '@/lib/sound'
import { useTableStore } from '@/store/useTableStore'
import { toast } from '@/store/useToastStore'
import { toCents, toLira } from '@shared/utils/currency'
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

// ============================================================================
// Types
// ============================================================================

export type PaymentMode = 'full' | 'items' | 'split'
export type ViewState = 'PAY' | 'SUCCESS'

export interface State {
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

export type Action =
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
// Utils (Pure Functions)
// ============================================================================

function parseMoneyToCents(input: string): number {
  const trimmed = input.trim()
  if (!trimmed) return 0
  const normalized = trimmed.replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return 0
  return toCents(normalized)
}

function centsToInputString(cents: number): string {
  const safe = Math.max(0, Math.trunc(cents))
  const lira = toLira(safe)
  const whole = Math.floor(lira)
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

// ============================================================================
// Reducer
// ============================================================================

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
// Hook Return Type Definition
// ============================================================================

export interface PaymentLogicReturn {
  state: State
  dispatch: React.Dispatch<Action>
  totals: {
    total: number
    paidAmount: number
    remainingAmount: number
    effectivePayment: number
    tendered: number
    currentChange: number
  }
  split: { n: number; base: number; remainder: number; share: number; idx: number }
  items: {
    unpaidItems: Array<{
      id: string
      quantity: number
      unitPrice: number
      product?: { name: string }
    }>
    selectedTotal: number
    isAllItemsSelected: boolean
  }
  flags: { canCashPay: boolean; canCardPay: boolean; processing: boolean }
  actions: {
    setTenderedInput: (raw: string) => void
    appendTendered: (chunk: string) => void
    backspaceTendered: () => void
    clearTendered: () => void
    handleSetExact: () => void
    handlePayment: (method: PaymentMethod) => Promise<void>
    setHoveredPaymentMethod: (method: PaymentMethod | null) => void
    handleClose: () => void
  }
}

// ============================================================================
// Main Hook
// ============================================================================

interface UsePaymentLogicProps {
  order: Order | null | undefined
  onProcessPayment: (
    amount: number,
    method: PaymentMethod,
    options?: { skipLog?: boolean; itemsToMarkPaid?: { id: string; quantity: number }[] }
  ) => Promise<unknown>
  onClose: () => void
  onPaymentComplete?: () => void
  open: boolean
}

export function usePaymentLogic({
  order,
  onProcessPayment,
  onClose,
  onPaymentComplete,
  open
}: UsePaymentLogicProps): PaymentLogicReturn {
  const clearSelection = useTableStore((s) => s.clearSelection)
  const [state, dispatch] = useReducer(reducer, initialState)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // --- Callbacks ---

  const handleTenderedChange = useCallback((raw: string): void => {
    const normalized = normalizeTenderedInput(raw)
    if (normalized === '' && raw !== '') return
    dispatch({ type: 'SET_TENDERED_INPUT', value: normalized })
  }, [])

  const appendTendered = useCallback(
    (chunk: string): void => {
      handleTenderedChange(state.tenderedInput + chunk)
    },
    [state.tenderedInput, handleTenderedChange]
  )

  const backspaceTendered = useCallback((): void => {
    handleTenderedChange(state.tenderedInput.slice(0, -1))
  }, [state.tenderedInput, handleTenderedChange])

  const clearTendered = useCallback((): void => {
    dispatch({ type: 'CLEAR_TENDERED' })
  }, [])

  const handleSetExact = useCallback((): void => {
    dispatch({ type: 'SET_TENDERED_INPUT', value: centsToInputString(effectivePayment) })
  }, [effectivePayment])

  const setHoveredPaymentMethod = useCallback((method: PaymentMethod | null): void => {
    dispatch({ type: 'SET_HOVER_PAYMENT', method })
  }, [])

  const handleClose = useCallback((): void => {
    if (state.view === 'SUCCESS') {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (onPaymentComplete) onPaymentComplete()
      else clearSelection()
    }
    dispatch({ type: 'RESET_TRANSIENT' })
    onClose()
  }, [state.view, onPaymentComplete, clearSelection, onClose])

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
        if (actualAmount > 0 || isItemsModeWithSelection) {
          const itemsToPay = isItemsModeWithSelection
            ? Object.entries(state.selectedQuantities).map(([id, quantity]) => ({ id, quantity }))
            : undefined

          await onProcessPayment(actualAmount, method, {
            skipLog: false,
            itemsToMarkPaid: itemsToPay
          })
        }

        const newRemaining = remainingAmount - actualAmount
        const shouldClose = newRemaining <= 1

        soundManager.playPaymentSuccess()
        dispatch({ type: 'CLEAR_TENDERED' })
        dispatch({ type: 'CLEAR_SELECTED' })

        if (shouldClose) {
          dispatch({ type: 'SET_SUCCESS', finalChange })
          timerRef.current = setTimeout(() => {
            onClose()
            if (onPaymentComplete) onPaymentComplete()
            else clearSelection()
          }, 3000)
          return
        }

        if (state.paymentMode === 'split') {
          dispatch({ type: 'NEXT_SPLIT_PERSON' })
        }

        dispatch({ type: 'SET_PROCESSING', method: null })
      } catch (error) {
        console.error('Payment failed:', error)
        soundManager.playError()
        toast({
          title: 'Ödeme başarısız',
          description: 'Lütfen tekrar deneyin.',
          variant: 'destructive'
        })
        dispatch({ type: 'SET_PROCESSING', method: null })
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
      state.processingMethod, // Eklendi: Dependency dizisindeki eksik tamamlandı
      onProcessPayment,
      onClose,
      onPaymentComplete,
      clearSelection
    ]
  )

  // --- Effects ---

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

  // ============================================================================
  // Memoized Return Object (Re-render Optimization)
  // ============================================================================

  return useMemo<PaymentLogicReturn>(
    () => ({
      state,
      dispatch,
      totals: { total, paidAmount, remainingAmount, effectivePayment, tendered, currentChange },
      split,
      items: { unpaidItems, selectedTotal, isAllItemsSelected },
      flags: { canCashPay, canCardPay, processing: !!state.processingMethod },
      actions: {
        setTenderedInput: handleTenderedChange,
        appendTendered,
        backspaceTendered,
        clearTendered,
        handleSetExact,
        handlePayment,
        setHoveredPaymentMethod,
        handleClose
      }
    }),
    [
      state,
      total,
      paidAmount,
      remainingAmount,
      effectivePayment,
      tendered,
      currentChange,
      split,
      unpaidItems,
      selectedTotal,
      isAllItemsSelected,
      canCashPay,
      canCardPay,
      handleTenderedChange,
      appendTendered,
      backspaceTendered,
      clearTendered,
      handleSetExact,
      handlePayment,
      setHoveredPaymentMethod,
      handleClose
    ]
  )
}
