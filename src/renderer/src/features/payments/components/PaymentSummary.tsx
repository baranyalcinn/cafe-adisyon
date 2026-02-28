'use client'

import { PremiumAmount } from '@/components/PremiumAmount'
import { DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Banknote, ChevronRight, ListChecks, LucideIcon, Users } from 'lucide-react'
import React, { memo } from 'react'
import { PaymentMode } from '../hooks/usePaymentLogic'

// ============================================================================
// Types & Constants
// ============================================================================

interface PaymentSummaryProps {
  remainingAmount: number
  paidAmount: number
  paymentMode: PaymentMode
  setMode: (mode: PaymentMode) => void
  tableName: string
}

const PAYMENT_MODES: { id: PaymentMode; label: string; icon: LucideIcon }[] = [
  { id: 'full', label: 'Tamamı', icon: Banknote },
  { id: 'split', label: 'Bölüştür', icon: Users },
  { id: 'items', label: 'Ürün Seç', icon: ListChecks }
]

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  container: 'p-6 pb-2',

  // Header
  headerBox: 'flex items-center justify-between mb-2',
  headerInner: 'flex items-center gap-3',
  title: 'text-[22px] font-semibold tracking-tight text-foreground',
  tableInfo: 'flex items-center gap-2 text-foreground/80',
  divider: 'text-[14px] font-bold opacity-30',
  tableName: 'text-[14px] font-black tracking-tight',

  // Amount Card
  cardWrapper: 'space-y-2 mb-3',
  card: 'rounded-2xl border border-border/40 bg-muted/10 shadow-sm px-6 py-4',
  cardInner: 'flex justify-between items-start gap-4',
  amountCol: 'flex flex-col items-start gap-1.5 px-1 flex-1',
  paidCol: 'flex flex-col items-end gap-1.5 px-1 flex-1 animate-in fade-in duration-200',
  amountLabel: 'text-[11px] font-bold text-foreground/70 tracking-widest uppercase',

  // Mode Buttons
  modesWrapper: 'flex gap-2 mb-2',
  modeBtnBase:
    'flex-1 h-12 flex items-center justify-center gap-2 rounded-xl transition-all duration-200 border',
  modeBtnActive: 'bg-primary border-primary text-primary-foreground shadow-md',
  modeBtnInactive:
    'bg-background border-border/40 text-foreground/90 hover:bg-muted/30 hover:text-foreground',
  modeIconBase: 'w-[18px] h-[18px]',
  modeText: 'text-[13px] font-extrabold tracking-tight whitespace-nowrap'
} as const

// ============================================================================
// Main Component
// ============================================================================

/**
 * Ödeme ekranının özet ve mod seçim tepsisi.
 * Kasiyer numaratörü kullanırken gereksiz re-render'ları önlemek için memo kullanılmıştır.
 */
export const PaymentSummary = memo(
  ({
    remainingAmount,
    paidAmount,
    paymentMode,
    setMode,
    tableName
  }: PaymentSummaryProps): React.JSX.Element => {
    return (
      <div className={STYLES.container}>
        {/* Header Area */}
        <div className={STYLES.headerBox}>
          <div className={STYLES.headerInner}>
            <DialogTitle className={STYLES.title}>Hesap Özeti</DialogTitle>
            <div className={STYLES.tableInfo}>
              <ChevronRight className="w-4 h-4 text-foreground/50" strokeWidth={2} />
              <span className="text-[14px] font-extrabold tracking-tight text-foreground/60">
                {tableName}
              </span>
            </div>
          </div>
        </div>

        {/* Amount Display Card */}
        <div className={STYLES.cardWrapper}>
          <div className={STYLES.card}>
            <div className={STYLES.cardInner}>
              {/* Remaining Amount */}
              <div className={STYLES.amountCol}>
                <span className={STYLES.amountLabel}>Kalan Tutar</span>
                <PremiumAmount amount={remainingAmount} size="3xl" color="primary" />
              </div>

              {/* Paid Amount (Dynamic) */}
              {paidAmount > 0 && (
                <div className={STYLES.paidCol}>
                  <span className={STYLES.amountLabel}>Ödenen</span>
                  <PremiumAmount amount={paidAmount} size="2xl" color="success" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Modes Selection */}
        <div className={STYLES.modesWrapper}>
          {PAYMENT_MODES.map(({ id, label, icon: Icon }) => {
            const isActive = paymentMode === id

            return (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={cn(
                  STYLES.modeBtnBase,
                  isActive ? STYLES.modeBtnActive : STYLES.modeBtnInactive
                )}
              >
                <div className="shrink-0 flex items-center">
                  <Icon
                    className={cn(
                      STYLES.modeIconBase,
                      isActive ? 'text-primary-foreground' : 'text-foreground/60'
                    )}
                  />
                </div>
                <span className={STYLES.modeText}>{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }
)

PaymentSummary.displayName = 'PaymentSummary'
