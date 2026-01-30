import { useState, memo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Coffee, ArrowRightLeft, Combine } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { cafeApi } from '@/lib/api'
import { toast } from '@/store/useToastStore'
import { useTables } from '@/hooks/useTables'
import { TableCardSkeleton } from './TableCardSkeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'

interface TableCardProps {
  id: string
  name: string
  hasOpenOrder: boolean
  isLocked?: boolean
  onClick: (id: string) => void
  onTransfer: (id: string) => void
  onMerge: (id: string) => void
}

const TableCard = memo(
  ({
    id,
    name,
    hasOpenOrder,
    isLocked,
    onClick,
    onTransfer,
    onMerge
  }: TableCardProps): React.JSX.Element => {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={() => onClick(id)}
            className={cn(
              'group relative flex flex-col items-center justify-center p-0 cursor-pointer transition-all duration-300',
              'hover:-translate-y-1 active:scale-95 !overflow-visible'
            )}
          >
            <div
              className={cn(
                'relative w-full h-full flex flex-col items-center justify-center gap-4 p-8 rounded-[2.5rem] overflow-hidden bg-background/50 backdrop-blur-sm',
                hasOpenOrder ? 'bg-info/[0.04]' : 'bg-success/[0.04]',
                isLocked && 'bg-warning/[0.04]'
              )}
            >
              {/* Subtle Glow Effect */}
              <div
                className={cn(
                  'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[80px] -z-10',
                  hasOpenOrder ? 'bg-info/20' : 'bg-success/20',
                  isLocked && 'bg-warning/20'
                )}
              />

              {isLocked && (
                <div className="absolute top-3 left-3 bg-warning/20 p-2 rounded-xl ring-2 ring-warning/30 animate-in fade-in zoom-in duration-500 z-10">
                  <div className="w-3.5 h-3.5 text-warning">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-full h-full"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'p-4.5 rounded-[2rem] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner',
                  hasOpenOrder ? 'bg-info/20 text-info' : 'bg-success/20 text-success',
                  isLocked && 'bg-warning/20 text-warning'
                )}
              >
                <Coffee className="w-12 h-12" />
              </div>

              <div className="text-center space-y-2">
                <span className="text-lg font-black text-foreground tracking-tight block">
                  {name}
                </span>
                <div
                  className={cn(
                    'text-[12px] uppercase font-black tracking-widest px-4 py-1.5 rounded-xl border-2 transition-colors',
                    hasOpenOrder
                      ? 'border-info/40 bg-info/15 text-info'
                      : 'border-success/40 bg-success/15 text-success',
                    isLocked && 'border-warning/40 bg-warning/15 text-warning'
                  )}
                >
                  {isLocked ? 'KİLİTLİ' : hasOpenOrder ? 'DOLU' : 'BOŞ'}
                </div>
              </div>
            </div>
          </button>
        </ContextMenuTrigger>
        {hasOpenOrder && (
          <ContextMenuContent className="min-w-[200px] p-2 rounded-xl">
            <ContextMenuItem
              onClick={() => onTransfer(id)}
              className="gap-3 py-2.5 rounded-lg font-medium cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4 text-info" />
              Başka Masaya Aktar
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onMerge(id)}
              className="gap-3 py-2.5 rounded-lg font-medium cursor-pointer"
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
  onTableSelect: (tableId: string) => void
}

export function TablesView({ onTableSelect }: TablesViewProps): React.JSX.Element {
  // Use React Query hook instead of store for fetching
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
      useCartStore.getState().clearCart() // Clear cart state after transfer
      refetch() // Refresh tables immediately
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
      useCartStore.getState().clearCart() // Clear cart state after merge
      refetch() // Refresh tables
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
      <div className="flex-none py-4 px-8 border-b bg-background/80 backdrop-blur-md z-10 w-full mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Masalar</h2>
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
          <>
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
            </div>

            {tables.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Coffee className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold">Henüz masa yok</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                  İşletmenizi yapılandırmak için ayarlar sayfasından masalar oluşturun.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transfer Modal */}
      <Dialog
        open={transferModal.open}
        onOpenChange={(open) =>
          !open && setTransferModal({ open: false, sourceTableId: null, sourceOrderId: null })
        }
      >
        <DialogContent>
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
          {tables.filter((t) => t.id !== transferModal.sourceTableId && !t.hasOpenOrder).length ===
            0 && (
            <p className="text-muted-foreground text-center">Transfer için uygun boş masa yok.</p>
          )}
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
        </DialogContent>
      </Dialog>

      {/* Merge Modal */}
      <Dialog
        open={mergeModal.open}
        onOpenChange={(open) =>
          !open && setMergeModal({ open: false, sourceTableId: null, sourceOrderId: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masa Birleştirme</DialogTitle>
            <DialogDescription>
              {mergeSourceTableName} masasının siparişini hangi masayla birleştirmek istiyorsunuz?
              (Kaynak masa silinecek)
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
          {tables.filter((t) => t.id !== mergeModal.sourceTableId && t.hasOpenOrder).length ===
            0 && (
            <p className="text-muted-foreground text-center">
              Birleştirme için uygun dolu masa yok.
            </p>
          )}
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
