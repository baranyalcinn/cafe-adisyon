// src/renderer/src/features/payments/PaymentModal.tsx
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useEffect, useRef } from 'react'

import { type Order, type PaymentMethod } from '@/lib/api'
import { cn } from '@/lib/utils'
import { usePaymentLogic } from './hooks/usePaymentLogic'

import { ModeContent } from './components/ModeContent'
import { Numpad } from './components/Numpad'
import { PaymentActions } from './components/PaymentActions'
import { PaymentDisplay } from './components/PaymentDisplay'
import { PaymentSummary } from './components/PaymentSummary'
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
    options?: { skipLog?: boolean; itemsToMarkPaid?: { id: string; quantity: number }[] }
  ) => Promise<unknown>
}

export function PaymentModal({
  open,
  onClose,
  onPaymentComplete,
  order,
  onProcessPayment,
  tableName
}: PaymentModalProps): React.JSX.Element {
  const { state, dispatch, totals, split, items, flags, actions } = usePaymentLogic({
    order,
    onProcessPayment,
    onClose,
    onPaymentComplete,
    open
  })

  const tenderedInputRef = useRef<HTMLInputElement | null>(null)

  // focus management
  useEffect(() => {
    if (!open) return
    if (state.view === 'SUCCESS') return

    const t = setTimeout(() => {
      tenderedInputRef.current?.focus()
    }, 50)
    return () => clearTimeout(t)
  }, [open, state.paymentMode, state.selectedQuantities, state.splitIndex, state.view])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (state.view === 'SUCCESS') return

    const key = e.key
    if (/^[0-9]$/.test(key)) {
      e.preventDefault()
      actions.appendTendered(key)
    } else if (key === '.' || key === ',') {
      e.preventDefault()
      if (!state.tenderedInput.includes('.')) actions.appendTendered('.')
    } else if (key === 'Backspace') {
      e.preventDefault()
      actions.backspaceTendered()
    } else if (key === 'Delete') {
      e.preventDefault()
      actions.clearTendered()
    } else if (key === 'Enter') {
      e.preventDefault()
      if (flags.canCashPay) {
        void actions.handlePayment('CASH')
      }
    }
  }

  if (state.view === 'SUCCESS') {
    return (
      <SuccessView
        open={open}
        finalChange={totals.currentChange}
        onOpenChange={(nextOpen) => !nextOpen && actions.handleClose()}
      />
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && actions.handleClose()}
      key="payment-modal"
    >
      <DialogContent
        className={cn(
          'sm:max-w-5xl p-0 gap-0 overflow-hidden h-[680px] flex flex-col md:flex-row',
          'rounded-2xl border border-border/40 shadow-lg bg-background',
          '[&>button]:hidden outline-none'
        )}
      >
        {/* LEFT PANEL */}
        <div className="w-[480px] flex flex-col border-r border-border/40 bg-background h-full">
          <PaymentSummary
            remainingAmount={totals.remainingAmount}
            paidAmount={totals.paidAmount}
            paymentMode={state.paymentMode}
            setMode={(mode) => dispatch({ type: 'SET_MODE', mode })}
            tableName={tableName || order?.table?.name || '---'}
          />

          <div className="flex-1 overflow-auto px-7 pb-7 scrollbar-hide">
            <ModeContent
              mode={state.paymentMode}
              remainingAmount={totals.remainingAmount}
              split={split}
              items={{
                unpaidItems: items.unpaidItems,
                selectedQuantities: state.selectedQuantities,
                isAllItemsSelected: items.isAllItemsSelected
              }}
              onSplitChange={(n) => dispatch({ type: 'SET_SPLIT', value: n })}
              onSplitIndexChange={(idx) => dispatch({ type: 'SET_SPLIT_INDEX', value: idx })}
              onNextSplit={() => dispatch({ type: 'NEXT_SPLIT_PERSON' })}
              onSelectAll={() => {
                if (items.isAllItemsSelected) dispatch({ type: 'CLEAR_SELECTED' })
                else {
                  const all: Record<string, number> = {}
                  items.unpaidItems.forEach((i) => {
                    all[i.id] = i.quantity
                  })
                  dispatch({ type: 'SELECT_ALL', all })
                }
              }}
              onItemQtyChange={(itemId, qty) => dispatch({ type: 'SET_SELECTED_QTY', itemId, qty })}
            />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col bg-muted/5 relative h-full overflow-hidden">
          <PaymentDisplay
            effectivePayment={totals.effectivePayment}
            tenderedInput={state.tenderedInput}
            onClear={actions.clearTendered}
            onFocus={() => tenderedInputRef.current?.focus()}
            hoveredMethod={state.hoveredPaymentMethod}
          />

          <input
            ref={tenderedInputRef}
            className="sr-only"
            onKeyDown={handleKeyDown}
            readOnly
            tabIndex={-1}
          />

          {/* Controls & Result Banner */}
          <div className="mt-auto p-6 pt-0 pb-7 flex flex-col gap-3 w-full max-w-[560px] mx-auto">
            <ResultBanner
              itemsPartialBlocked={
                state.paymentMode === 'items' &&
                totals.tendered > 0 &&
                totals.tendered < totals.effectivePayment
              }
              tendered={totals.tendered}
              effectivePayment={totals.effectivePayment}
              currentChange={totals.currentChange}
              hoveredMethod={state.hoveredPaymentMethod}
              className="mb-6"
            />

            <Numpad
              onAppend={actions.appendTendered}
              onBackspace={actions.backspaceTendered}
              onQuickCash={actions.setTenderedInput}
              onSetExact={actions.handleSetExact}
              effectivePayment={totals.effectivePayment}
              partialPaymentsBlocked={
                state.paymentMode === 'items' && Object.keys(state.selectedQuantities).length > 0
              }
            />

            <PaymentActions
              canCashPay={flags.canCashPay}
              canCardPay={flags.canCardPay}
              processingMethod={state.processingMethod}
              onPayment={actions.handlePayment}
              onHoverChange={actions.setHoveredPaymentMethod}
              itemsPartialBlocked={
                state.paymentMode === 'items' &&
                totals.tendered > 0 &&
                totals.tendered < totals.effectivePayment
              }
              tendered={totals.tendered}
              effectivePayment={totals.effectivePayment}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
