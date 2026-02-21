import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useTables } from '@/hooks/useTables'
import { cafeApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/store/useCartStore'
import { toast } from '@/store/useToastStore'
import { ArrowRightLeft, Coffee, Combine, Lock } from 'lucide-react'
import { memo, useCallback, useState } from 'react'

import { TableCardSkeleton } from './TableCardSkeleton'

interface TableCardProps {
  id: string
  name: string
  hasOpenOrder: boolean
  isLocked?: boolean
  onClick: (id: string, name: string) => void
  onTransfer: (id: string) => void
  onMerge: (id: string) => void
}

export const TableCard = memo(
  ({ id, name, hasOpenOrder, isLocked, onClick, onTransfer, onMerge }: TableCardProps) => {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={() => onClick(id, name)}
            className={cn(
              'group relative flex flex-col items-center justify-center p-6 rounded-[2.5rem] transition-all duration-300 ease-out cursor-pointer w-full text-center outline-none focus-visible:ring-2 focus-visible:ring-primary/70 active:scale-[0.96] gpu-accelerated select-none',

              // STATE: FULL (Dolu)
              hasOpenOrder && [
                'bg-info/10 border-2 border-info shadow-sm',
                'hover:bg-info/20 hover:shadow-md'
              ],

              // STATE: EMPTY (Boş)
              !hasOpenOrder &&
                !isLocked && [
                  'bg-emerald-500/5 border-2 border-emerald-500/20 shadow-sm',
                  'hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:shadow-md'
                ],

              // STATE: LOCKED (Kilitli)
              isLocked && [
                'bg-warning/10 border-2 border-warning shadow-sm',
                'hover:bg-warning/20 hover:shadow-md opacity-90'
              ]
            )}
          >
            {/* Kilit İkonu - Floating badge */}
            {isLocked && (
              <div className="absolute -top-1 -left-1 bg-warning p-2 rounded-xl text-white shadow-lg shadow-warning/20 ring-4 ring-background z-20">
                <Lock className="w-4 h-4" strokeWidth={3} />
              </div>
            )}

            {/* Merkez İkon */}
            <div className="relative mb-6">
              <div
                className={cn(
                  'p-5 rounded-[2rem] transition-all duration-300 shadow-sm group-hover:rotate-3 group-hover:scale-110',
                  hasOpenOrder
                    ? 'bg-info text-white shadow-info/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
                  isLocked && 'bg-warning text-white shadow-warning/20'
                )}
              >
                <Coffee className="w-10 h-10" strokeWidth={2.5} />
              </div>
            </div>

            {/* Metin ve Rozet */}
            <div className="space-y-3 w-full relative z-10">
              <span className="text-xl font-black text-foreground tracking-tight line-clamp-1 block">
                {name}
              </span>
              <div className="flex justify-center">
                <span
                  className={cn(
                    'text-[10px] font-black tracking-[0.2em] px-4 py-1.5 rounded-full uppercase transition-all duration-300',
                    hasOpenOrder
                      ? 'bg-info text-white shadow-sm'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-transparent',
                    isLocked && 'bg-warning text-white shadow-sm'
                  )}
                >
                  {isLocked ? 'KİLİTLİ' : hasOpenOrder ? 'DOLU' : 'BOŞ'}
                </span>
              </div>
            </div>
          </button>
        </ContextMenuTrigger>

        {/* Context Menu */}
        {hasOpenOrder && (
          <ContextMenuContent className="min-w-[220px] p-1.5 rounded-xl shadow-xl">
            <ContextMenuItem
              onClick={() => onTransfer(id)}
              className="gap-3 py-3 px-3 rounded-lg font-medium cursor-pointer hover:bg-info/10 focus:bg-info/10 focus:text-info"
            >
              <ArrowRightLeft className="w-4 h-4 text-info" />
              Başka Masaya Aktar
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onMerge(id)}
              className="gap-3 py-3 px-3 rounded-lg font-medium cursor-pointer mt-1 hover:bg-primary/10 focus:bg-primary/10 focus:text-primary"
            >
              <Combine className="w-4 h-4 text-primary" />
              Başka Masa ile Birleştir
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
    )
  }
)

TableCard.displayName = 'TableCard'

interface TablesViewProps {
  onTableSelect: (tableId: string, tableName: string) => void
}

export function TablesView({ onTableSelect }: TablesViewProps): React.JSX.Element {
  const { data: tables = [], isLoading, refetch } = useTables()

  const [transferModal, setTransferModal] = useState<{
    open: boolean
    sourceTableId: string | null
    sourceOrderId: string | null
  }>({ open: false, sourceTableId: null, sourceOrderId: null })

  const [mergeModal, setMergeModal] = useState<{
    open: boolean
    sourceTableId: string | null
    sourceOrderId: string | null
  }>({ open: false, sourceTableId: null, sourceOrderId: null })

  const [isProcessing, setIsProcessing] = useState(false)

  const handleTransferClick = useCallback(async (tableId: string): Promise<void> => {
    try {
      const order = await cafeApi.orders.getOpenByTable(tableId)
      if (order) {
        setTransferModal({ open: true, sourceTableId: tableId, sourceOrderId: order.id })
      }
    } catch (error) {
      console.error('Failed to get order:', error)
    }
  }, [])

  const handleMergeClick = useCallback(async (tableId: string): Promise<void> => {
    try {
      const order = await cafeApi.orders.getOpenByTable(tableId)
      if (order) {
        setMergeModal({ open: true, sourceTableId: tableId, sourceOrderId: order.id })
      }
    } catch (error) {
      console.error('Failed to get order:', error)
    }
  }, [])

  const handleTransferToTable = async (targetTableId: string): Promise<void> => {
    if (!transferModal.sourceOrderId) return
    setIsProcessing(true)
    try {
      await cafeApi.orders.transfer(transferModal.sourceOrderId, targetTableId)
      const targetTable = tables.find((t) => t.id === targetTableId)
      const sourceTable = tables.find((t) => t.id === transferModal.sourceTableId)
      setTransferModal({ open: false, sourceTableId: null, sourceOrderId: null })
      useCartStore.getState().clearCart()
      refetch()
      toast({
        title: 'Transfer Başarılı',
        description: `${sourceTable?.name || 'Kaynak masa'} siparişi ${targetTable?.name || 'hedef masaya'} aktarıldı!`,
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Transfer Hatası',
        description: 'Transfer hatası: ' + String(error),
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMergeWithTable = async (targetTableId: string): Promise<void> => {
    if (!mergeModal.sourceOrderId) return
    setIsProcessing(true)
    try {
      const targetOrder = await cafeApi.orders.getOpenByTable(targetTableId)
      if (!targetOrder) {
        toast({
          title: 'Hata',
          description: 'Hedef masada açık sipariş yok!',
          variant: 'warning'
        })
        return
      }
      await cafeApi.orders.merge(mergeModal.sourceOrderId, targetOrder.id)
      setMergeModal({ open: false, sourceTableId: null, sourceOrderId: null })
      useCartStore.getState().clearCart()
      refetch()
    } catch (error) {
      toast({
        title: 'Birleştirme Hatası',
        description: 'Birleştirme hatası: ' + String(error),
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const sourceTableName = tables.find((t) => t.id === transferModal.sourceTableId)?.name
  const mergeSourceTableName = tables.find((t) => t.id === mergeModal.sourceTableId)?.name

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header Section */}
      <div className="flex-none py-6 px-8 border-b bg-background z-10 w-full mb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Masalar</h2>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-info" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black tabular-nums text-foreground">
                  {tables.filter((t) => t.hasOpenOrder).length}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground/80 tracking-[0.2em] uppercase">
                  DOLU
                </span>
              </div>
            </div>

            <div className="w-[1px] h-4 bg-border" />

            <div className="flex items-center gap-3 group cursor-default">
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-success" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black tabular-nums text-foreground">
                  {tables.filter((t) => !t.hasOpenOrder).length}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground/80 tracking-[0.2em] uppercase">
                  BOŞ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-8 pb-12 outline-none"
        role="grid"
        tabIndex={0}
        autoFocus
      >
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <TableCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
            {tables.map((table) => (
              <TableCard
                key={table.id}
                id={table.id}
                name={table.name}
                hasOpenOrder={!!table.hasOpenOrder}
                isLocked={table.isLocked}
                onClick={onTableSelect}
                onTransfer={handleTransferClick}
                onMerge={handleMergeClick}
              />
            ))}
            {tables.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Coffee className="w-8 h-8 text-muted-foreground/80" />
                </div>
                <h3 className="text-lg font-semibold">Henüz masa yok</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                  İşletmenizi yapılandırmak için ayarlar sayfasından masalar oluşturun.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <Dialog
        open={transferModal.open}
        onOpenChange={(open) =>
          !open && setTransferModal({ open: false, sourceTableId: null, sourceOrderId: null })
        }
      >
        <DialogContent>
          {transferModal.open && (
            <>
              <DialogHeader>
                <DialogTitle>Masa Transferi</DialogTitle>
                <DialogDescription>
                  {sourceTableName} masasının siparişini hangi masaya aktarmak istiyorsunuz?
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-2 py-4">
                {tables
                  .filter((t) => t.id !== transferModal.sourceTableId && !t.hasOpenOrder)
                  .map((table) => (
                    <Button
                      key={table.id}
                      variant="outline"
                      onClick={() => handleTransferToTable(table.id)}
                      disabled={isProcessing}
                    >
                      {table.name}
                    </Button>
                  ))}
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setTransferModal({ open: false, sourceTableId: null, sourceOrderId: null })
                  }
                >
                  İptal
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={mergeModal.open}
        onOpenChange={(open) =>
          !open && setMergeModal({ open: false, sourceTableId: null, sourceOrderId: null })
        }
      >
        <DialogContent>
          {mergeModal.open && (
            <>
              <DialogHeader>
                <DialogTitle>Masa Birleştirme</DialogTitle>
                <DialogDescription>
                  {mergeSourceTableName} masasının siparişini hangi masayla birleştirmek
                  istiyorsunuz?
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-2 py-4">
                {tables
                  .filter((t) => t.id !== mergeModal.sourceTableId && t.hasOpenOrder)
                  .map((table) => (
                    <Button
                      key={table.id}
                      variant="outline"
                      onClick={() => handleMergeWithTable(table.id)}
                      disabled={isProcessing}
                    >
                      {table.name}
                    </Button>
                  ))}
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setMergeModal({ open: false, sourceTableId: null, sourceOrderId: null })
                  }
                >
                  İptal
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
