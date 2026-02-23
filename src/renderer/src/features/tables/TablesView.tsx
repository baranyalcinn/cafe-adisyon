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
              'group relative flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-300 ease-out cursor-pointer w-full text-center outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              'hover:-translate-y-1.5 hover:shadow-2xl',
              isPressed && 'scale-[0.97]',

              // STATE: FULL (Dolu)
              hasOpenOrder &&
                !isLocked && [
                  'bg-indigo-600 border-2 border-indigo-400/30',
                  'hover:bg-indigo-700 hover:border-indigo-400/50 hover:shadow-2xl hover:shadow-indigo-600/30'
                ],

              // STATE: EMPTY (Boş)
              !hasOpenOrder &&
                !isLocked && [
                  'bg-teal-600 border-2 border-teal-400/30',
                  'hover:bg-teal-700 hover:border-teal-400/50 hover:shadow-2xl hover:shadow-teal-600/30'
                ],

              // STATE: LOCKED (Kilitli)
              isLocked && [
                'bg-orange-600 border-2 border-orange-400/30',
                'hover:bg-orange-700 hover:border-orange-400/50'
              ]
            )}
          >
            {/* Kilit Badge */}
            {isLocked && (
              <>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-2xl bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,currentColor_10px,currentColor_20px)]" />
                <div className="absolute -top-2 -left-2 bg-orange-600 p-2 rounded-xl text-white shadow-lg shadow-orange-600/20 z-20 animate-in zoom-in duration-200">
                  <Lock className="w-4 h-4" strokeWidth={2.5} />
                </div>
              </>
            )}

            {/* Merkez İkon - Daha Büyük */}
            <div
              className={cn(
                'p-5 rounded-2xl transition-all duration-300 mb-5',
                'group-hover:scale-110 group-hover:rotate-3',
                hasOpenOrder && !isLocked && 'bg-white/20 text-white shadow-lg shadow-black/10',
                !hasOpenOrder && !isLocked && 'bg-black/10 text-white group-hover:bg-black/20',
                isLocked && 'bg-white/20 text-white shadow-lg shadow-black/10'
              )}
            >
              <Coffee className="w-9 h-9" strokeWidth={2} />
            </div>

            {/* İçerik - DAHA BÜYÜK VE OKUNUR YAZILAR */}
            <div className="space-y-3 w-full px-2">
              {/* Masa Adı - Daha Büyük, Kalın, Gölge */}
              <span className="text-xl font-bold text-white tracking-tight truncate block">
                {name}
              </span>

              {/* Durum Rozeti - Daha Büyük, Daha Belirgin */}
              <span
                className={cn(
                  'inline-flex items-center px-4 py-1.5 rounded-lg text-[11px] font-black tracking-[0.2em] shadow-sm transition-all duration-300',
                  hasOpenOrder && !isLocked && 'bg-white text-indigo-700',
                  !hasOpenOrder && !isLocked && 'bg-white text-teal-700 group-hover:bg-teal-50',
                  isLocked && 'bg-white text-orange-700'
                )}
              >
                {isLocked ? 'KİLİTLİ' : hasOpenOrder ? 'DOLU' : 'BOŞ'}
              </span>
            </div>

            {/* Hover shimmer & glow effects */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
              <div
                className={cn(
                  'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                  hasOpenOrder && 'bg-white/10',
                  !hasOpenOrder && 'bg-white/10',
                  isLocked && 'bg-white/10'
                )}
              />
            </div>
          </button>
        </ContextMenuTrigger>

        {/* Context Menu */}
        {hasOpenOrder && !isLocked && (
          <ContextMenuContent className="w-56 p-2 rounded-xl shadow-2xl border bg-popover text-popover-foreground">
            <ContextMenuItem
              onClick={() => onTransfer(id)}
              className="gap-3 py-3 px-3 rounded-lg text-sm font-semibold cursor-pointer hover:bg-indigo-600/10 focus:bg-indigo-600/10"
            >
              <div className="p-2 bg-indigo-600/10 rounded-lg">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              </div>
              Masaya Aktar
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onMerge(id)}
              className="gap-3 py-3 px-3 rounded-lg text-sm font-semibold cursor-pointer mt-1 hover:bg-primary/10 focus:bg-primary/10"
            >
              <div className="p-2 bg-primary/10 rounded-lg">
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
      <div className="flex-none h-16 px-6 border-b bg-background shadow-sm z-10 w-full flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Coffee className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">Masalar</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Dolu Masa Badge */}
            <div className="flex items-center gap-2 bg-indigo-600 px-3 py-1.5 rounded-lg shadow-sm border border-indigo-400/20 text-white">
              <span className="text-lg font-bold tabular-nums">
                {tables.filter((t) => t.hasOpenOrder).length}
              </span>
              <span className="text-[10px] font-black tracking-widest uppercase">Dolu</span>
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Boş Masa Badge */}
            <div className="flex items-center gap-2 bg-teal-600 px-3 py-1.5 rounded-lg shadow-sm border border-teal-400/20 text-white">
              <span className="text-lg font-bold tabular-nums">
                {tables.filter((t) => !t.hasOpenOrder).length}
              </span>
              <span className="text-[10px] font-black tracking-widest uppercase">Boş</span>
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
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-zinc-950 rounded-2xl [&>button:last-child]:hidden">
          <div className="bg-indigo-600 p-8 text-white">
            <div className="flex items-center gap-6">
              <div className="flex-none w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center ring-4 ring-white/10 shadow-inner">
                <ArrowRightLeft className="w-8 h-8 text-white" />
              </div>
              <DialogHeader className="space-y-1.5 text-left">
                <DialogTitle className="text-2xl font-black tracking-tight text-white">
                  Masa Transferi
                </DialogTitle>
                <DialogDescription className="text-base text-white/80 font-medium">
                  {sourceTableName} siparişini aktar
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="p-8 bg-zinc-50 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-xs font-black text-zinc-500 px-1">Hedef Masa Seçin</h4>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800 ml-4" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {tables
                .filter((t) => t.id !== transferModal.sourceTableId && !t.hasOpenOrder)
                .map((table) => (
                  <button
                    key={table.id}
                    onClick={() => handleTransferToTable(table.id)}
                    disabled={isProcessing}
                    className="group relative px-2 py-4 h-16 rounded-xl bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 shadow-sm transition-all duration-300 hover:border-indigo-500 hover:-translate-y-1 hover:shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center overflow-hidden"
                  >
                    <span className="relative z-10 text-base font-black text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors whitespace-nowrap overflow-hidden text-ellipsis px-1">
                      {table.name}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                  </button>
                ))}
            </div>

            {tables.filter((t) => t.id !== transferModal.sourceTableId && !t.hasOpenOrder)
              .length === 0 && (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <p className="font-medium">Boş masa bulunmuyor</p>
                <p className="text-sm mt-1">Tüm masalar dolu görünüyor</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-white dark:bg-zinc-950 flex justify-end">
            <Button
              variant="ghost"
              onClick={() =>
                setTransferModal({ open: false, sourceTableId: null, sourceOrderId: null })
              }
              className="text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-6"
            >
              İptal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Modal */}
      <Dialog
        open={mergeModal.open}
        onOpenChange={(open) =>
          !open && setMergeModal({ open: false, sourceTableId: null, sourceOrderId: null })
        }
      >
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-zinc-950 rounded-2xl [&>button:last-child]:hidden">
          <div className="bg-teal-600 p-8 text-white">
            <div className="flex items-center gap-6">
              <div className="flex-none w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center ring-4 ring-white/10 shadow-inner">
                <Combine className="w-8 h-8 text-white" />
              </div>
              <DialogHeader className="space-y-1.5 text-left">
                <DialogTitle className="text-2xl font-black tracking-tight text-white">
                  Masa Birleştirme
                </DialogTitle>
                <DialogDescription className="text-base text-white/80 font-medium">
                  {mergeSourceTableName} siparişini birleştir
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="p-8 bg-zinc-50 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-xs font-black text-zinc-500 tracking-[0.2em] px-1">
                Birleştirilecek Masayı Seçin
              </h4>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800 ml-4" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {tables
                .filter((t) => t.id !== mergeModal.sourceTableId && t.hasOpenOrder)
                .map((table) => (
                  <button
                    key={table.id}
                    onClick={() => handleMergeWithTable(table.id)}
                    disabled={isProcessing}
                    className="group relative px-2 py-4 h-16 rounded-xl bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 shadow-sm transition-all duration-300 hover:border-teal-500 hover:-translate-y-1 hover:shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center overflow-hidden"
                  >
                    <span className="relative z-10 text-base font-black text-zinc-900 dark:text-zinc-100 group-hover:text-teal-600 transition-colors whitespace-nowrap overflow-hidden text-ellipsis px-1">
                      {table.name}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-teal-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                  </button>
                ))}
            </div>

            {tables.filter((t) => t.id !== mergeModal.sourceTableId && t.hasOpenOrder).length ===
              0 && (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <p className="font-medium">Birleştirilecek masa bulunmuyor</p>
                <p className="text-sm mt-1">Diğer masaların siparişi bulunmuyor</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-white dark:bg-zinc-950 flex justify-end">
            <Button
              variant="ghost"
              onClick={() =>
                setMergeModal({ open: false, sourceTableId: null, sourceOrderId: null })
              }
              className="text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-6"
            >
              İptal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
