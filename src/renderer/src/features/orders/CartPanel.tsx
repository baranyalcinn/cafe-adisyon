import { PremiumAmount } from '@/components/PremiumAmount'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useSound } from '@/hooks/useSound'
import type { Order } from '@/lib/api'
import { soundManager } from '@/lib/sound'
import { cn, formatCurrency } from '@/lib/utils'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import {
  Banknote,
  History as HistoryIcon,
  Lock,
  LockOpen,
  Receipt,
  ShoppingBag,
  Trash2,
  Wallet
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CartPaidItem } from './components/CartPaidItem'
import { CartUnpaidItem } from './components/CartUnpaidItem'

// ============================================================================
// Types
// ============================================================================

interface CartPanelProps {
  order: Order | null | undefined
  isLocked: boolean
  onPaymentClick: () => void
  onUpdateItem: (orderItemId: string, quantity: number) => void
  onRemoveItem: (orderItemId: string) => void
  onToggleLock: () => void
  onDeleteOrder: (orderId: string) => void
}

type ProcessedCartItem = NonNullable<Order['items']>[number] & {
  formattedName: string
}

// ============================================================================
// Constants & Pure Functions
// ============================================================================

const formatProductName = (name: string): string => {
  return name.replace(/([a-zğüşöçı])([A-ZĞÜŞÖÇİ])/g, '$1 $2')
}

const STYLES = {
  container:
    'w-96 bg-background border-l border-border flex flex-col h-full animate-in slide-in-from-right duration-500 relative overflow-hidden shadow-2xl gpu-accelerated',
  header:
    'shrink-0 h-14 px-6 border-b border-border bg-background z-20 flex items-center justify-between',
  headerTitle:
    'text-base font-black tracking-tight flex items-center gap-2 text-foreground min-w-0',
  iconBtn: 'h-9 w-9 rounded-xl transition-all duration-300',
  lockedBtn: 'text-amber-500 bg-amber-500/15 border border-amber-500/20 shadow-sm',
  unlockedBtn: 'text-foreground/80 hover:text-foreground hover:bg-muted/80',
  deleteBtnActive:
    'text-foreground/80 hover:text-destructive hover:bg-destructive/15 hover:border-destructive/20',
  deleteBtnDisabled: 'opacity-0 pointer-events-none',
  bodyContainer: 'flex-1 min-h-0 overflow-hidden relative z-10 flex flex-col',
  scrollArea:
    'flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent',
  itemsWrapper: 'p-4 flex flex-col min-h-min space-y-2',
  emptyState:
    'flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300',
  emptyIconBg:
    'w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-5 border-2 border-dashed border-muted-foreground/20'
} as const

// ============================================================================
// Component
// ============================================================================

export const CartPanel = React.memo(function CartPanel({
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

  // Tüm timer'ları güvenli şekilde temizler (hem unmount anında hem de manuel)
  const clearAllTimers = useCallback(() => {
    debounceTimers.current.forEach((timer) => clearTimeout(timer))
    debounceTimers.current.clear()
  }, [])

  useEffect(() => {
    return clearAllTimers
  }, [clearAllTimers])

  const items = order?.items ?? []

  // Unpaid ve Paid listeyi ayır
  const { unpaidItems, paidItems } = useMemo(() => {
    if (!items.length) {
      return { unpaidItems: [] as ProcessedCartItem[], paidItems: [] as ProcessedCartItem[] }
    }

    const unpaid: ProcessedCartItem[] = []
    const paidMap = new Map<string, ProcessedCartItem>()

    for (const item of items) {
      const formattedName = formatProductName(item.product?.name || 'Yeni Ürün')

      if (!item.isPaid) {
        unpaid.push({ ...item, formattedName })
        continue
      }

      const existing = paidMap.get(item.productId)
      if (existing) {
        paidMap.set(item.productId, { ...existing, quantity: existing.quantity + item.quantity })
      } else {
        paidMap.set(item.productId, { ...item, formattedName })
      }
    }

    return { unpaidItems: unpaid, paidItems: Array.from(paidMap.values()) }
  }, [items])

  // Totaller
  const total = order?.totalAmount || 0
  const paidAmount = order?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remainingAmount = Math.max(0, total - paidAmount)

  const handleUpdateQuantity = useCallback(
    (orderItemId: string, _productId: string, newQuantity: number): void => {
      if (isLocked) {
        soundManager.playError()
        return
      }

      const item = order?.items?.find((i) => i.id === orderItemId)
      if (item?.isPaid) {
        soundManager.playError()
        return
      }

      const currentQuantity = item?.quantity || 0

      // Ses efekti çal
      if (newQuantity > currentQuantity) {
        playAdd()
      } else {
        playRemove()
      }

      // Varolan timer'ı iptal et
      const existingTimer = debounceTimers.current.get(orderItemId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // Eğer ürün tamamen silinmek isteniyorsa timer bekleme, anında sil
      if (newQuantity <= 0) {
        const isLastUnpaidItem = unpaidItems.length === 1 && unpaidItems[0]?.id === orderItemId

        if (isLastUnpaidItem) {
          if (paidAmount > 0) {
            onRemoveItem(orderItemId)
          } else {
            setShowDeleteDialog(true)
          }
        } else {
          onRemoveItem(orderItemId)
        }
        return
      }

      // Değilse miktar güncellemeyi debounce'a al
      const timer = setTimeout(() => {
        onUpdateItem(orderItemId, newQuantity)
        debounceTimers.current.delete(orderItemId)
      }, 300)

      debounceTimers.current.set(orderItemId, timer)
    },
    [
      isLocked,
      order?.items,
      unpaidItems,
      paidAmount,
      onRemoveItem,
      onUpdateItem,
      playAdd,
      playRemove
    ]
  )

  const handleConfirmDelete = useCallback((): void => {
    if (!order || paidAmount > 0) return
    clearAllTimers() // Sipariş silinmeden önce bekleyen tüm güncellemeleri iptal et
    onDeleteOrder(order.id)
    setShowDeleteDialog(false)
  }, [order, onDeleteOrder, paidAmount, clearAllTimers])

  const hasItems = unpaidItems.length > 0 || paidItems.length > 0
  const hasPaidItems = paidItems.length > 0

  return (
    <div className={STYLES.container}>
      {/* Header */}
      <div className={STYLES.header}>
        <h2 className={STYLES.headerTitle}>Adisyon</h2>

        <div className="flex items-center gap-1.5 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleLock}
            className={cn(STYLES.iconBtn, isLocked ? STYLES.lockedBtn : STYLES.unlockedBtn)}
            title={isLocked ? 'Masayı Aç' : 'Masayı Kilitle'}
            aria-label={isLocked ? 'Masayı Aç' : 'Masayı Kilitle'}
          >
            {isLocked ? (
              <Lock className="w-4 h-4" strokeWidth={2.5} />
            ) : (
              <LockOpen className="w-4 h-4" strokeWidth={2.5} />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              STYLES.iconBtn,
              !hasItems || paidAmount > 0 ? STYLES.deleteBtnDisabled : STYLES.deleteBtnActive
            )}
            onClick={() => setShowDeleteDialog(true)}
            disabled={!hasItems || paidAmount > 0}
            title={paidAmount > 0 ? 'Ödeme alınmış adisyon silinemez' : 'Masayı Boşalt'}
            aria-label="Masayı Boşalt"
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className={STYLES.bodyContainer}>
        {hasItems ? (
          <div className={STYLES.scrollArea}>
            <div className={STYLES.itemsWrapper}>
              {/* Unpaid Items */}
              <div className="space-y-1">
                {unpaidItems.map((item) => (
                  <CartUnpaidItem
                    key={item.id}
                    item={item}
                    isLocked={isLocked}
                    onUpdateQuantity={handleUpdateQuantity}
                  />
                ))}
              </div>

              {/* Paid Items */}
              {hasPaidItems && (
                <div className="mt-6 pt-4 border-t border-dashed border-border/35">
                  <div className="flex items-center gap-2 mb-3 px-1 text-muted-foreground/65">
                    <HistoryIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black tracking-[0.18em]">
                      ÖDENMİŞ KALEMLER
                    </span>
                  </div>

                  <div className="space-y-1 opacity-90">
                    {paidItems.map((item) => (
                      <CartPaidItem key={`${item.productId}-paid-group`} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyCartState />
        )}
      </div>

      {/* Footer */}
      {hasItems && (
        <CartFooter
          total={total}
          paidAmount={paidAmount}
          remainingAmount={remainingAmount}
          onPaymentClick={() => {
            playClick()
            onPaymentClick()
          }}
        />
      )}

      {/* Delete Modal */}
      <DeleteOrderDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          playRemove()
          handleConfirmDelete()
        }}
        onCancel={() => {
          playClick()
          setShowDeleteDialog(false)
        }}
      />
    </div>
  )
})

// ============================================================================
// Sub-Components (Memoized for performance)
// ============================================================================

const EmptyCartState = function EmptyCartState(): React.JSX.Element {
  return (
    <div className={STYLES.emptyState}>
      <div className={STYLES.emptyIconBg}>
        <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-base font-black text-foreground/70 mb-1">Adisyon Boş</h3>
      <p className="text-xs font-medium text-muted-foreground/60 max-w-[220px] leading-relaxed">
        Soldan ürün seçerek başlayın.
      </p>
    </div>
  )
}

interface CartFooterProps {
  total: number
  paidAmount: number
  remainingAmount: number
  onPaymentClick: () => void
}

const CartFooter = function CartFooter({
  total,
  paidAmount,
  remainingAmount,
  onPaymentClick
}: CartFooterProps): React.JSX.Element {
  return (
    <div className="shrink-0 px-5 py-4 bg-background/85 backdrop-blur-xl border-t border-border/10 z-20 rounded-t-[2rem] shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.35)]">
      <div className="space-y-4">
        {paidAmount > 0 && (
          <div className="space-y-2 px-1">
            <div className="flex justify-between items-center text-[14px]">
              <div className="flex items-center gap-2 text-muted-foreground/95 font-bold tracking-tight">
                <Receipt className="w-4 h-4" /> Ara Toplam
              </div>
              <span className="text-foreground/99 font-black tabular-nums tracking-tight">
                {formatCurrency(total)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[14px]">
              <div className="flex items-center gap-2 text-emerald-600/90 dark:text-emerald-400/90 font-bold tracking-tight">
                <Wallet className="w-4 h-4" /> Ödenen
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-black tabular-nums tracking-tight">
                -{formatCurrency(paidAmount)}
              </span>
            </div>
            <div className="h-px bg-border/10 w-full mt-1" />
          </div>
        )}
        <div className="flex justify-between items-end gap-3 px-1">
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-black text-muted-foreground/95 tracking-[0.16em] mb-1 flex items-center gap-2">
              Toplam Tutar
            </span>
            <PremiumAmount amount={remainingAmount} size="2xl" fontWeight="black" />
          </div>
          <Button
            size="lg"
            className="h-11 px-5 text-sm font-black rounded-2xl shadow-lg shadow-primary/20 bg-primary text-primary-foreground active:scale-95 transition-all shrink-0"
            onClick={onPaymentClick}
            disabled={remainingAmount <= 0}
          >
            <Banknote className="w-4 h-4 mr-2" /> ÖDEME AL
          </Button>
        </div>
      </div>
    </div>
  )
}

interface DeleteOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
}

const DeleteOrderDialog = function DeleteOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel
}: DeleteOrderDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[400px] p-0 overflow-hidden border-none bg-transparent shadow-none outline-none"
        aria-describedby={undefined}
      >
        <VisuallyHidden.Root asChild>
          <DialogTitle>Adisyonu Sil</DialogTitle>
        </VisuallyHidden.Root>
        <div className="group bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center mx-auto rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-inner">
              <Trash2 className="w-10 h-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-foreground">Adisyonu Sil?</h3>
              <p className="text-muted-foreground/70 leading-relaxed font-medium">
                Bu işlem adisyondaki tüm ürünleri silecek ve masayı boşaltacaktır. Emin misiniz?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 h-12 rounded-2xl font-bold border-border/50 hover:bg-muted/50"
              >
                Vazgeç
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                className="flex-1 h-12 rounded-2xl font-black tracking-wider shadow-lg shadow-destructive/20 active:scale-95"
              >
                Evet, Sil
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
