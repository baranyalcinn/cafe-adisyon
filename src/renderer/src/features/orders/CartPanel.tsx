import React, { useState, useCallback, useRef } from 'react'
import { Minus, Plus, Trash2, CreditCard, CheckCircle, Lock, LockOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCartStore } from '@/store/useCartStore'
import { useOrderStore } from '@/store/useOrderStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { soundManager } from '@/lib/sound'

interface CartPanelProps {
  onPaymentClick: () => void
  tableName: string
}

export function CartPanel({ onPaymentClick, tableName }: CartPanelProps): React.JSX.Element {
  const { items, getTotal } = useCartStore()
  const { currentOrder, updateOrderItem, removeOrderItem, deleteOrder, isLocked, toggleLock } =
    useOrderStore()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Debounce refs for quantity updates
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const total = getTotal()
  const paidAmount = currentOrder?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remainingAmount = total - paidAmount

  // Get orderItem from currentOrder by productId
  const getOrderItem = useCallback(
    (productId: string): { id: string; isPaid?: boolean; productId: string } | undefined => {
      return currentOrder?.items?.find((item) => item.productId === productId)
    },
    [currentOrder?.items]
  )

  const getOrderItemId = useCallback(
    (productId: string): string | null => {
      const orderItem = getOrderItem(productId)
      return orderItem?.id || null
    },
    [getOrderItem]
  )

  const isItemPaid = useCallback(
    (productId: string): boolean => {
      const orderItem = getOrderItem(productId)
      return orderItem?.isPaid ?? false
    },
    [getOrderItem]
  )

  const handleRemoveItem = useCallback(
    (productId: string): void => {
      if (isLocked) {
        soundManager.playError()
        return
      }
      if (isItemPaid(productId)) {
        soundManager.playError()
        return
      }

      if (items.length === 1 && currentOrder) {
        setShowDeleteDialog(true)
      } else {
        const orderItemId = getOrderItemId(productId)
        if (orderItemId) {
          removeOrderItem(orderItemId)
        }
      }
    },
    [isLocked, isItemPaid, items.length, currentOrder, getOrderItemId, removeOrderItem]
  )

  // Debounced quantity update (300ms delay)
  const handleUpdateQuantity = useCallback(
    (productId: string, newQuantity: number): void => {
      if (isLocked) {
        soundManager.playError()
        return
      }
      if (isItemPaid(productId)) {
        soundManager.playError()
        return
      }

      const orderItemId = getOrderItemId(productId)
      if (!orderItemId) return

      soundManager.playBeep()

      // Clear existing timer for this product
      const existingTimer = debounceTimers.current.get(productId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      if (newQuantity <= 0) {
        // Immediate removal, no debounce
        handleRemoveItem(productId)
      } else {
        // Set new debounced call
        const timer = setTimeout(async () => {
          await updateOrderItem(orderItemId, newQuantity)
          debounceTimers.current.delete(productId)
        }, 300)

        debounceTimers.current.set(productId, timer)
      }
    },
    [isLocked, isItemPaid, getOrderItemId, updateOrderItem, handleRemoveItem]
  )

  const handleConfirmDelete = async (): Promise<void> => {
    if (currentOrder) {
      await deleteOrder(currentOrder.id)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      <div className="p-5 border-b flex justify-between items-center bg-card">
        <div>
          <h3 className="text-xl font-bold">{tableName}</h3>
          <p className="text-sm text-muted-foreground mt-1">Adisyon</p>
        </div>
        {currentOrder?.items && currentOrder.items.length > 0 && (
          <Button
            variant={isLocked ? 'default' : 'ghost'}
            size="sm"
            onClick={toggleLock}
            className={cn(
              'gap-2 transition-all',
              isLocked
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {isLocked ? (
              <>
                <Lock className="w-4 h-4" />
                Kilitli
              </>
            ) : (
              <>
                <LockOpen className="w-4 h-4" />
                Kilitle
              </>
            )}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 flex flex-col gap-2">
            {currentOrder?.items && currentOrder.items.length > 0 ? (
              [...currentOrder.items]
                .sort((a, b) => {
                  const aIsPaid = a.isPaid ? 1 : 0
                  const bIsPaid = b.isPaid ? 1 : 0
                  return (
                    aIsPaid - bIsPaid ||
                    (a.product?.name || '').localeCompare(b.product?.name || '', undefined, {
                      numeric: true
                    })
                  )
                })
                .map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-xl border shadow-sm transition-colors',
                        item.isPaid
                          ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60'
                          : 'bg-card hover:bg-accent/5'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.isPaid && (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          )}
                          <p
                            className={cn(
                              'font-semibold text-sm line-clamp-2 leading-tight',
                              item.isPaid && 'line-through text-muted-foreground'
                            )}
                          >
                            {item.product?.name || 'Ürün'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(item.unitPrice)} × {item.quantity}
                          {item.isPaid && (
                            <span className="ml-2 text-emerald-500 font-medium">Ödendi</span>
                          )}
                        </p>
                      </div>

                      {!item.isPaid && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                            onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                            disabled={isLocked}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-bold text-lg tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                            onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                            disabled={isLocked}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1 rounded-lg"
                            onClick={() => handleRemoveItem(item.productId)}
                            disabled={isLocked}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {item.isPaid && (
                        <span className="text-sm font-bold text-emerald-500 tabular-nums">
                          {item.quantity}×
                        </span>
                      )}
                    </div>
                  )
                })
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">Sepet boş</p>
                <p className="text-sm mt-2">Ürün eklemek için tıklayın</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="p-5 border-t space-y-4 bg-card">
        {paidAmount > 0 && (
          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">Ödenen</span>
            <span className="text-emerald-500 font-semibold">{formatCurrency(paidAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-xl font-bold">
          <span>{paidAmount > 0 ? 'Kalan' : 'Toplam'}</span>
          <span className="text-primary">{formatCurrency(remainingAmount)}</span>
        </div>

        <Button
          className="w-full gap-3 h-14 text-lg"
          size="lg"
          disabled={!currentOrder?.items || currentOrder.items.length === 0 || remainingAmount <= 0}
          onClick={onPaymentClick}
        >
          <CreditCard className="w-6 h-6" />
          Ödeme Al
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masa Boşaltılsın mı?</DialogTitle>
            <DialogDescription>
              Masadaki son ürünü siliyorsunuz. Bu işlem masayı tamamen boşaltacak ve adisyonu
              kapatacaktır. Onaylıyor musunuz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Masayı Boşalt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
