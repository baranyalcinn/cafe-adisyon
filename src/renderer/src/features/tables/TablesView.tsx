import { useEffect, useState, memo } from 'react'
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

const TableCard = memo(
  ({
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
              'group relative flex flex-col items-center justify-center gap-4 p-8 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer overflow-hidden',
              'hover:scale-105 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] active:scale-95',
              hasOpenOrder
                ? 'bg-red-500/5 border-red-500/30 hover:border-red-400/50'
                : 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-400/50',
              isLocked && 'bg-amber-500/5 border-amber-500/30 hover:border-amber-400/50'
            )}
          >
            {/* Subtle Glow Effect */}
            <div
              className={cn(
                'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl -z-10',
                hasOpenOrder ? 'bg-red-500/10' : 'bg-emerald-500/10',
                isLocked && 'bg-amber-500/10'
              )}
            />

            {isLocked && (
              <div className="absolute top-4 left-4 bg-amber-500/20 p-2 rounded-xl ring-1 ring-amber-500/50 animate-in fade-in zoom-in duration-500">
                <div className="w-4 h-4 text-amber-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
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

            {/* Status Indicator Dot */}
            <div
              className={cn(
                'absolute top-5 right-5 w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]',
                hasOpenOrder
                  ? 'bg-red-400 text-red-400 animate-pulse'
                  : 'bg-emerald-400 text-emerald-400 shadow-none',
                isLocked && 'bg-amber-400 text-amber-400'
              )}
            />

            <div
              className={cn(
                'p-4 rounded-3xl transition-all duration-500 group-hover:rotate-12 group-hover:scale-110',
                hasOpenOrder ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400',
                isLocked && 'bg-amber-500/10 text-amber-400'
              )}
            >
              <Coffee className="w-12 h-12" />
            </div>

            <div className="text-center space-y-1.5">
              <span className="text-lg font-bold text-foreground/90 tracking-tight block">
                {name}
              </span>
              <div
                className={cn(
                  'text-[10px] uppercase font-semibold tracking-wider px-3 py-0.5 rounded-full border bg-background/50',
                  hasOpenOrder
                    ? 'border-red-500/30 text-red-500/80'
                    : 'border-emerald-500/30 text-emerald-500/80',
                  isLocked && 'border-amber-500/30 text-amber-500/80'
                )}
              >
                {isLocked ? 'KİLİTLİ' : hasOpenOrder ? 'DOLU' : 'BOŞ'}
              </div>
            </div>
          </button>
        </ContextMenuTrigger>
        {hasOpenOrder && (
          <ContextMenuContent className="min-w-[200px] p-2 rounded-xl">
            <ContextMenuItem
              onClick={onTransfer}
              className="gap-3 py-2.5 rounded-lg font-medium cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4 text-blue-500" />
              Başka Masaya Aktar
            </ContextMenuItem>
            <ContextMenuItem
              onClick={onMerge}
              className="gap-3 py-2.5 rounded-lg font-medium cursor-pointer"
            >
              <Combine className="w-4 h-4 text-purple-500" />
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
  const tables = useTableStore((state) => state.tables)
  const isLoading = useTableStore((state) => state.isLoading)
  const fetchTables = useTableStore((state) => state.fetchTables)

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
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header Section */}
      <div className="flex-none py-4 px-8 border-b bg-background/50 backdrop-blur z-10 w-full mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Masa Seçimi</h2>
            <p className="text-sm text-muted-foreground">Sipariş almak için bir masa seçin</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 pb-32">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
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
