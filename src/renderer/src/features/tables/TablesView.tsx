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
    const [isPressed, setIsPressed] = useState(false)

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={() => onClick(id, name)}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            className={cn(
              'group relative flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-200 ease-out cursor-pointer w-full text-center outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              isPressed && 'scale-[0.97]',

              // STATE: FULL (Dolu)
              hasOpenOrder &&
                !isLocked && [
                  'bg-gradient-to-br from-info/15 to-info/5 border-2 border-info/40',
                  'hover:from-info/20 hover:to-info/10 hover:border-info/50 hover:shadow-lg hover:shadow-info/10'
                ],

              // STATE: EMPTY (Boş)
              !hasOpenOrder &&
                !isLocked && [
                  'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-2 border-emerald-500/30',
                  'hover:from-emerald-500/15 hover:to-emerald-500/10 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10'
                ],

              // STATE: LOCKED (Kilitli)
              isLocked && [
                'bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-2 border-amber-500/40',
                'hover:from-amber-500/20 hover:to-amber-500/10'
              ]
            )}
          >
            {/* Kilit Badge */}
            {isLocked && (
              <div className="absolute -top-2 -left-2 bg-amber-500 p-2 rounded-xl text-white shadow-lg shadow-amber-500/20 z-20 animate-in zoom-in duration-200">
                <Lock className="w-4 h-4" strokeWidth={2.5} />
              </div>
            )}

            {/* Merkez İkon - Daha Büyük */}
            <div
              className={cn(
                'p-5 rounded-2xl transition-all duration-300 mb-5',
                'group-hover:scale-110 group-hover:rotate-3',
                hasOpenOrder && !isLocked && 'bg-info text-white shadow-lg shadow-info/25',
                !hasOpenOrder &&
                  !isLocked &&
                  'bg-emerald-500/15 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white',
                isLocked && 'bg-amber-500/20 text-amber-600'
              )}
            >
              <Coffee className="w-9 h-9" strokeWidth={2} />
            </div>

            {/* İçerik - DAHA BÜYÜK VE OKUNUR YAZILAR */}
            <div className="space-y-3 w-full px-2">
              {/* Masa Adı - Daha Büyük, Kalın, Gölge */}
              <span className="text-xl font-bold text-foreground tracking-tight truncate block">
                {name}
              </span>

              {/* Durum Rozeti - Daha Büyük, Daha Belirgin */}
              <span
                className={cn(
                  'inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black tracking-widest  shadow-sm',
                  hasOpenOrder && !isLocked && 'bg-info text-white shadow-info/20',
                  !hasOpenOrder &&
                    !isLocked &&
                    'bg-emerald-500 text-white shadow-emerald-500/20 group-hover:bg-emerald-600 transition-colors',
                  isLocked && 'bg-amber-500 text-white shadow-amber-500/20'
                )}
              >
                {isLocked ? 'KİLİTLİ' : hasOpenOrder ? 'DOLU' : 'BOŞ'}
              </span>
            </div>

            {/* Hover glow efekti */}
            <div
              className={cn(
                'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none',
                hasOpenOrder && 'bg-info/5',
                !hasOpenOrder && 'bg-emerald-500/5',
                isLocked && 'bg-amber-500/5'
              )}
            />
          </button>
        </ContextMenuTrigger>

        {/* Context Menu */}
        {hasOpenOrder && !isLocked && (
          <ContextMenuContent className="w-56 p-1 rounded-xl shadow-xl border border-border/50 bg-popover/95 backdrop-blur">
            <ContextMenuItem
              onClick={() => onTransfer(id)}
              className="gap-3 py-2.5 px-3 rounded-lg text-sm font-medium cursor-pointer hover:bg-info/10 focus:bg-info/10"
            >
              <div className="p-1.5 bg-info/10 rounded-md">
                <ArrowRightLeft className="w-4 h-4 text-info" />
              </div>
              Masaya Aktar
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onMerge(id)}
              className="gap-3 py-2.5 px-3 rounded-lg text-sm font-medium cursor-pointer mt-0.5 hover:bg-primary/10 focus:bg-primary/10"
            >
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Combine className="w-4 h-4 text-primary" />
              </div>
              Masa Birleştir
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
      <div className="flex-none h-14 px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 w-full flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Coffee className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Masalar</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Dolu Masa Badge */}
            <div className="flex items-center gap-2 bg-info/10 px-3 py-1.5 rounded-lg border border-info/20">
              <span className="text-lg font-bold tabular-nums text-info">
                {tables.filter((t) => t.hasOpenOrder).length}
              </span>
              <span className="text-[10px] font-semibold text-info/80  tracking-wider">Dolu</span>
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Boş Masa Badge */}
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <span className="text-lg font-bold tabular-nums text-emerald-600">
                {tables.filter((t) => !t.hasOpenOrder).length}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600/80  tracking-wider">
                Boş
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <TableCardSkeleton key={i} />
            ))}
          </div>
        ) : tables.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
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
        ) : (
          <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mb-6 ring-4 ring-muted/30">
              <Coffee className="w-10 h-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Henüz masa bulunmuyor</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs text-center">
              Ayarlar sayfasından masa ekleyerek başlayabilirsiniz.
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center mx-auto sm:mx-0">
              <ArrowRightLeft className="w-6 h-6 text-info" />
            </div>
            <div className="text-center sm:text-left">
              <DialogTitle className="text-lg">Masa Transferi</DialogTitle>
              <DialogDescription className="text-sm mt-1.5">
                <span className="font-semibold text-foreground">{sourceTableName}</span> masasının
                siparişini aktarın
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-2 py-4">
            {tables
              .filter((t) => t.id !== transferModal.sourceTableId && !t.hasOpenOrder)
              .map((table) => (
                <button
                  key={table.id}
                  onClick={() => handleTransferToTable(table.id)}
                  disabled={isProcessing}
                  className="p-3 rounded-xl border border-border bg-background hover:bg-accent hover:border-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-accent-foreground">
                    {table.name}
                  </span>
                </button>
              ))}
          </div>

          <DialogFooter className="sm:justify-start">
            <Button
              variant="outline"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto sm:mx-0">
              <Combine className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center sm:text-left">
              <DialogTitle className="text-lg">Masa Birleştirme</DialogTitle>
              <DialogDescription className="text-sm mt-1.5">
                <span className="font-semibold text-foreground">{mergeSourceTableName}</span>{' '}
                masasını birleştirin
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-2 py-4">
            {tables
              .filter((t) => t.id !== mergeModal.sourceTableId && t.hasOpenOrder)
              .map((table) => (
                <button
                  key={table.id}
                  onClick={() => handleMergeWithTable(table.id)}
                  disabled={isProcessing}
                  className="p-3 rounded-xl border border-border bg-background hover:bg-accent hover:border-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-accent-foreground">
                    {table.name}
                  </span>
                </button>
              ))}
          </div>

          <DialogFooter className="sm:justify-start">
            <Button
              variant="outline"
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
