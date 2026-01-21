import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Coffee, ArrowRightLeft, Combine } from 'lucide-react'
import { useTableStore } from '@/store/useTableStore'
import { useCartStore } from '@/store/useCartStore'
import { cafeApi } from '@/lib/api'
import { toast } from '@/store/useToastStore'
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
  onClick: () => void
  onTransfer: () => void
  onMerge: () => void
}

const TableCard = ({
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
          onClick={onClick}
          className={cn(
            'group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer min-h-[140px]',
            hasOpenOrder
              ? 'bg-gradient-to-br from-red-500/20 to-red-600/30 border-red-500/50 hover:border-red-400'
              : 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border-emerald-500/50 hover:border-emerald-400',
            isLocked && 'border-amber-500/50 bg-gradient-to-br from-amber-500/20 to-amber-600/30'
          )}
        >
          {isLocked && (
            <div className="absolute top-3 left-3 bg-amber-500/20 p-1.5 rounded-full ring-1 ring-amber-500/50 animate-in fade-in zoom-in duration-300">
              <div className="w-4 h-4 text-amber-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
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
              'absolute top-3 right-3 w-3 h-3 rounded-full animate-pulse',
              hasOpenOrder ? 'bg-red-400' : 'bg-emerald-400',
              isLocked && 'bg-amber-400'
            )}
          />
          <Coffee
            className={cn(
              'w-10 h-10 transition-transform group-hover:scale-110',
              hasOpenOrder ? 'text-red-400' : 'text-emerald-400',
              isLocked && 'text-amber-400'
            )}
          />
          <span className="text-lg font-semibold text-foreground">{name}</span>
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              hasOpenOrder ? 'bg-red-500/30 text-red-300' : 'bg-emerald-500/30 text-emerald-300',
              isLocked && 'bg-amber-500/30 text-amber-300'
            )}
          >
            {isLocked ? 'Kilitli' : hasOpenOrder ? 'Dolu' : 'Boş'}
          </span>
        </button>
      </ContextMenuTrigger>
      {hasOpenOrder && (
        <ContextMenuContent>
          <ContextMenuItem onClick={onTransfer} className="gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Başka Masaya Aktar
          </ContextMenuItem>
          <ContextMenuItem onClick={onMerge} className="gap-2">
            <Combine className="w-4 h-4" />
            Başka Masa ile Birleştir
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  )
}

interface TablesViewProps {
  onTableSelect: (tableId: string) => void
}

export function TablesView({ onTableSelect }: TablesViewProps): React.JSX.Element {
  const { tables, isLoading, fetchTables } = useTableStore()

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

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  const handleTransferClick = async (tableId: string): Promise<void> => {
    try {
      const order = await cafeApi.orders.getOpenByTable(tableId)
      if (order) {
        setTransferModal({ open: true, sourceTableId: tableId, sourceOrderId: order.id })
      }
    } catch (error) {
      console.error('Failed to get order:', error)
    }
  }

  const handleMergeClick = async (tableId: string): Promise<void> => {
    try {
      const order = await cafeApi.orders.getOpenByTable(tableId)
      if (order) {
        setMergeModal({ open: true, sourceTableId: tableId, sourceOrderId: order.id })
      }
    } catch (error) {
      console.error('Failed to get order:', error)
    }
  }

  const handleTransferToTable = async (targetTableId: string): Promise<void> => {
    if (!transferModal.sourceOrderId) return
    setIsProcessing(true)
    try {
      await cafeApi.orders.transfer(transferModal.sourceOrderId, targetTableId)
      const targetTable = tables.find((t) => t.id === targetTableId)
      const sourceTable = tables.find((t) => t.id === transferModal.sourceTableId)
      setTransferModal({ open: false, sourceTableId: null, sourceOrderId: null })
      useCartStore.getState().clearCart() // Clear cart state after transfer
      fetchTables()
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
      fetchTables()
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  const sourceTableName = tables.find((t) => t.id === transferModal.sourceTableId)?.name
  const mergeSourceTableName = tables.find((t) => t.id === mergeModal.sourceTableId)?.name

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Masalar</h1>
          <p className="text-muted-foreground">Sipariş almak için bir masa seçin</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            id={table.id}
            name={table.name}
            hasOpenOrder={table.hasOpenOrder}
            isLocked={table.isLocked}
            onClick={() => onTableSelect(table.id)}
            onTransfer={() => handleTransferClick(table.id)}
            onMerge={() => handleMergeClick(table.id)}
          />
        ))}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Coffee className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Henüz masa bulunmuyor. Ayarlar sayfasından masa ekleyebilirsiniz.</p>
        </div>
      )}

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
