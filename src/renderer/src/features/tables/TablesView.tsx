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
import { toast } from '@/store/useToastStore'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, Coffee, Combine, Loader2, Lock, type LucideIcon } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'

import { TableCardSkeleton } from './TableCardSkeleton'

// ============================================================================
// Types
// ============================================================================

type TableStatus = 'occupied' | 'empty' | 'locked'

interface TableCardProps {
  id: string
  name: string
  hasOpenOrder: boolean
  isLocked?: boolean
  onClick: (id: string, name: string) => void
  onTransfer: (id: string) => void
  onMerge: (id: string) => void
}

interface SimpleTableItem {
  id: string
  name: string
}

interface TableActionModalProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  selectLabel: string
  accent: 'indigo' | 'teal'
  Icon: LucideIcon
  targetTables: SimpleTableItem[]
  emptyTitle: string
  emptyDescription: string
  onSelect: (tableId: string) => void
  isProcessing: boolean
  processingTargetId: string | null
}

type ActionModalState = {
  open: boolean
  sourceTableId: string | null
  sourceOrderId: string | null
}

type ProcessingState = {
  type: 'transfer' | 'merge' | null
  targetTableId: string | null
}

// ============================================================================
// Constants & Styles
// ============================================================================

const TABLE_GRID_CLASS =
  'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 auto-rows-fr'

const TABLE_STATUS_STYLES: Record<
  TableStatus,
  { card: string; hover: string; icon: string; badge: string; label: string; overlay: string }
> = {
  occupied: {
    card: 'bg-indigo-600/95 border-indigo-300/30',
    hover:
      'hover:bg-indigo-600 hover:border-indigo-300/50 hover:shadow-2xl hover:shadow-indigo-600/25',
    icon: 'bg-white/20 text-white shadow-lg shadow-black/10',
    badge: 'bg-white text-indigo-700',
    label: 'DOLU',
    overlay: 'bg-white/10'
  },
  empty: {
    card: 'bg-emerald-600/95 border-emerald-300/30',
    hover:
      'hover:bg-emerald-600 hover:border-emerald-300/50 hover:shadow-2xl hover:shadow-emerald-600/25',
    icon: 'bg-black/10 text-white group-hover:bg-black/20',
    badge: 'bg-white text-emerald-700',
    label: 'BOŞ',
    overlay: 'bg-white/10'
  },
  locked: {
    card: 'bg-zinc-700/95 border-zinc-400/30',
    hover: 'hover:bg-zinc-700 hover:border-zinc-300/40 hover:shadow-2xl hover:shadow-zinc-900/20',
    icon: 'bg-white/15 text-white shadow-lg shadow-black/10',
    badge: 'bg-amber-50 text-amber-700',
    label: 'KİLİTLİ',
    overlay: 'bg-white/5'
  }
}

// Modal Temalarını render dışında tutuyoruz (Performans & Bellek Yönetimi)
const MODAL_THEMES = {
  indigo: {
    bar: 'bg-indigo-600',
    soft: 'bg-indigo-50 dark:bg-indigo-950/30',
    softIcon: 'text-indigo-600 dark:text-indigo-300',
    chip: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900',
    buttonHoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-700',
    buttonHoverText: 'group-hover:text-indigo-700 dark:group-hover:text-indigo-300',
    buttonLine: 'bg-indigo-500',
    spinner: 'text-indigo-600 dark:text-indigo-300',
    borderSoft: 'border-indigo-100 dark:border-indigo-900'
  },
  teal: {
    bar: 'bg-teal-600',
    soft: 'bg-teal-50 dark:bg-teal-950/30',
    softIcon: 'text-teal-600 dark:text-teal-300',
    chip: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900',
    buttonHoverBorder: 'hover:border-teal-300 dark:hover:border-teal-700',
    buttonHoverText: 'group-hover:text-teal-700 dark:group-hover:text-teal-300',
    buttonLine: 'bg-teal-500',
    spinner: 'text-teal-600 dark:text-teal-300',
    borderSoft: 'border-teal-100 dark:border-teal-900'
  }
} as const

const STYLES = {
  cardBase: cn(
    'group relative h-full min-h-[180px] w-full text-center rounded-2xl p-5',
    'flex flex-col items-center justify-center outline-none cursor-pointer border-2',
    'transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out',
    'motion-safe:hover:-translate-y-1 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/50'
  ),
  iconBase:
    'p-4 rounded-2xl mb-4 transition-[transform,background-color] duration-200 motion-safe:group-hover:scale-105 motion-safe:group-hover:rotate-2 motion-reduce:transform-none',
  menuItem: 'gap-3 py-3 px-3 rounded-lg text-sm font-semibold cursor-pointer',
  targetButtonBase: cn(
    'group relative h-14 rounded-xl border bg-card px-2 flex items-center justify-center shadow-sm',
    'transition-[transform,border-color,box-shadow,background-color] duration-150',
    'hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed border-border'
  )
} as const

// ============================================================================
// Pure Helpers
// ============================================================================

function getTableStatus(hasOpenOrder: boolean, isLocked?: boolean): TableStatus {
  if (isLocked) return 'locked'
  return hasOpenOrder ? 'occupied' : 'empty'
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Beklenmeyen bir hata oluştu.'
}

// ============================================================================
// Sub-Components
// ============================================================================

const TableActionModal = memo(function TableActionModal({
  open,
  onClose,
  title,
  description,
  selectLabel,
  accent,
  Icon,
  targetTables,
  emptyTitle,
  emptyDescription,
  onSelect,
  isProcessing,
  processingTargetId
}: TableActionModalProps): React.JSX.Element {
  const theme = MODAL_THEMES[accent]

  // JSX Rahatlatmak için Render Fonksiyonları
  const renderTargetList = (): React.JSX.Element => (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
      {targetTables.map((table) => {
        const isThisProcessing = isProcessing && processingTargetId === table.id

        return (
          <button
            key={table.id}
            type="button"
            onClick={() => onSelect(table.id)}
            disabled={isProcessing}
            className={cn(STYLES.targetButtonBase, theme.buttonHoverBorder)}
          >
            <span
              className={cn(
                'relative z-10 inline-flex items-center gap-1.5 max-w-full px-1 text-sm font-semibold text-foreground transition-colors truncate',
                theme.buttonHoverText
              )}
            >
              {isThisProcessing && (
                <Loader2 className={cn('w-4 h-4 animate-spin shrink-0', theme.spinner)} />
              )}
              <span className="truncate">{table.name}</span>
            </span>
            <div
              className={cn(
                'absolute inset-x-2 bottom-1 h-0.5 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-150 origin-left',
                theme.buttonLine
              )}
            />
          </button>
        )
      })}
    </div>
  )

  const renderEmptyState = (): React.JSX.Element => (
    <div className="rounded-xl border bg-card p-6 text-center">
      <div
        className={cn(
          'mx-auto mb-3 w-10 h-10 rounded-lg flex items-center justify-center',
          theme.soft
        )}
      >
        <Icon className={cn('w-4 h-4', theme.softIcon)} />
      </div>
      <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
      <p className="text-xs text-muted-foreground mt-1">{emptyDescription}</p>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border bg-background shadow-2xl [&>button:last-child]:hidden">
        <div className={cn('h-1.5 w-full', theme.bar)} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b bg-background">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center border',
                theme.soft,
                theme.borderSoft
              )}
            >
              <Icon className={cn('w-6 h-6', theme.softIcon)} />
            </div>

            <div className="min-w-0 flex-1">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {description}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div
              className={cn(
                'hidden sm:inline-flex items-center px-2.5 h-7 rounded-md border text-[11px] font-medium',
                theme.chip
              )}
            >
              {accent === 'indigo' ? 'Transfer' : 'Birleştir'}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 bg-muted/20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
              {selectLabel}
            </h4>
            <div className="h-px flex-1 bg-border ml-3" />
          </div>
          {targetTables.length > 0 ? renderTargetList() : renderEmptyState()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-background flex justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-9 px-4 text-muted-foreground hover:text-foreground"
          >
            İptal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
})

TableActionModal.displayName = 'TableActionModal'

export const TableCard = memo(function TableCard({
  id,
  name,
  hasOpenOrder,
  isLocked,
  onClick,
  onTransfer,
  onMerge
}: TableCardProps): React.JSX.Element {
  const status = getTableStatus(hasOpenOrder, isLocked)
  const styles = TABLE_STATUS_STYLES[status]

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={() => onClick(id, name)}
          className={cn(STYLES.cardBase, styles.card, styles.hover)}
          aria-label={`${name} masası`}
        >
          {/* Lock Badge */}
          {isLocked && (
            <>
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-2xl bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,currentColor_10px,currentColor_20px)]" />
              <div className="absolute -top-2 -left-2 bg-amber-500 p-2 rounded-xl text-white shadow-lg shadow-amber-600/20 z-20 animate-in zoom-in duration-200">
                <Lock className="w-4 h-4" strokeWidth={2.5} />
              </div>
            </>
          )}

          {/* Center Icon */}
          <div className={cn(STYLES.iconBase, styles.icon)}>
            <Coffee className="w-8 h-8" strokeWidth={2} />
          </div>

          {/* Content */}
          <div className="space-y-2 w-full px-1">
            <span className="text-lg font-bold text-white tracking-tight truncate block">
              {name}
            </span>
            <span
              className={cn(
                'inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold tracking-wide shadow-sm transition-colors duration-200',
                styles.badge
              )}
            >
              {styles.label}
            </span>
          </div>

          {/* Hover Shimmer */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 hidden motion-safe:block">
              <div className="absolute inset-0 -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-20deg]" />
            </div>
            <div
              className={cn(
                'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                styles.overlay
              )}
            />
          </div>
        </button>
      </ContextMenuTrigger>

      {/* Context Menu */}
      {hasOpenOrder && !isLocked && (
        <ContextMenuContent className="w-56 p-2 rounded-xl shadow-2xl border bg-popover text-popover-foreground">
          <ContextMenuItem
            onSelect={() => onTransfer(id)}
            className={cn(STYLES.menuItem, 'hover:bg-indigo-600/10 focus:bg-indigo-600/10')}
          >
            <div className="p-2 bg-indigo-600/10 rounded-lg">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            </div>
            Masaya Aktar
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => onMerge(id)}
            className={cn(STYLES.menuItem, 'mt-1 hover:bg-teal-600/10 focus:bg-teal-600/10')}
          >
            <div className="p-2 bg-teal-600/10 rounded-lg">
              <Combine className="w-4 h-4 text-teal-600" />
            </div>
            Masa Birleştir
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  )
})

TableCard.displayName = 'TableCard'

// ============================================================================
// Main Component
// ============================================================================

interface TablesViewProps {
  onTableSelect: (tableId: string, tableName: string) => void
}

export function TablesView({ onTableSelect }: TablesViewProps): React.JSX.Element {
  const { data: tables = [], isLoading, refetch } = useTables()
  const queryClient = useQueryClient()

  const [transferModal, setTransferModal] = useState<ActionModalState>({
    open: false,
    sourceTableId: null,
    sourceOrderId: null
  })
  const [mergeModal, setMergeModal] = useState<ActionModalState>({
    open: false,
    sourceTableId: null,
    sourceOrderId: null
  })
  const [processing, setProcessing] = useState<ProcessingState>({ type: null, targetTableId: null })

  // Data Derivation
  const derived = useMemo(() => {
    const tableMap = new Map<string, (typeof tables)[number]>()
    const occupiedUnlocked: SimpleTableItem[] = []
    const emptyUnlocked: SimpleTableItem[] = []

    for (const table of tables) {
      tableMap.set(table.id, table)
      if (table.isLocked) continue

      if (table.hasOpenOrder) occupiedUnlocked.push({ id: table.id, name: table.name })
      else emptyUnlocked.push({ id: table.id, name: table.name })
    }

    return {
      tableMap,
      occupiedUnlocked,
      emptyUnlocked,
      occupiedCount: occupiedUnlocked.length,
      emptyCount: emptyUnlocked.length
    }
  }, [tables])

  const transferTargets = useMemo(
    () => derived.emptyUnlocked.filter((t) => t.id !== transferModal.sourceTableId),
    [derived.emptyUnlocked, transferModal.sourceTableId]
  )
  const mergeTargets = useMemo(
    () => derived.occupiedUnlocked.filter((t) => t.id !== mergeModal.sourceTableId),
    [derived.occupiedUnlocked, mergeModal.sourceTableId]
  )

  // Callbacks
  const closeTransferModal = useCallback(
    () => setTransferModal({ open: false, sourceTableId: null, sourceOrderId: null }),
    []
  )
  const closeMergeModal = useCallback(
    () => setMergeModal({ open: false, sourceTableId: null, sourceOrderId: null }),
    []
  )
  const resetProcessing = useCallback(() => setProcessing({ type: null, targetTableId: null }), [])

  const handleTransferClick = useCallback(async (tableId: string): Promise<void> => {
    try {
      const order = await cafeApi.orders.getOpenByTable(tableId)
      if (!order) {
        toast({
          title: 'Açık Sipariş Bulunamadı',
          description: 'Bu masada aktarılacak açık sipariş yok.',
          variant: 'warning'
        })
        return
      }
      setTransferModal({ open: true, sourceTableId: tableId, sourceOrderId: order.id })
    } catch (error) {
      toast({
        title: 'Transfer Hazırlanamadı',
        description: getErrorMessage(error),
        variant: 'destructive'
      })
    }
  }, [])

  const handleMergeClick = useCallback(async (tableId: string): Promise<void> => {
    try {
      const order = await cafeApi.orders.getOpenByTable(tableId)
      if (!order) {
        toast({
          title: 'Açık Sipariş Bulunamadı',
          description: 'Bu masada birleştirilecek açık sipariş yok.',
          variant: 'warning'
        })
        return
      }
      setMergeModal({ open: true, sourceTableId: tableId, sourceOrderId: order.id })
    } catch (error) {
      toast({
        title: 'Birleştirme Hazırlanamadı',
        description: getErrorMessage(error),
        variant: 'destructive'
      })
    }
  }, [])

  const handleTransferToTable = useCallback(
    async (targetTableId: string): Promise<void> => {
      if (!transferModal.sourceOrderId) return
      setProcessing({ type: 'transfer', targetTableId })

      try {
        await cafeApi.orders.transfer(transferModal.sourceOrderId, targetTableId)
        const targetTable = derived.tableMap.get(targetTableId)
        const sourceTable = transferModal.sourceTableId
          ? derived.tableMap.get(transferModal.sourceTableId)
          : undefined

        closeTransferModal()
        await refetch()
        queryClient.invalidateQueries({ queryKey: ['order'] })
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['tables'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })

        toast({
          title: 'Transfer Başarılı',
          description: `${sourceTable?.name ?? 'Kaynak masa'} siparişi ${targetTable?.name ?? 'hedef masaya'} aktarıldı.`,
          variant: 'success'
        })
      } catch (error) {
        toast({
          title: 'Transfer Hatası',
          description: getErrorMessage(error),
          variant: 'destructive'
        })
      } finally {
        resetProcessing()
      }
    },
    [transferModal, derived.tableMap, closeTransferModal, refetch, resetProcessing, queryClient]
  )

  const handleMergeWithTable = useCallback(
    async (targetTableId: string): Promise<void> => {
      if (!mergeModal.sourceOrderId) return
      setProcessing({ type: 'merge', targetTableId })

      try {
        const targetOrder = await cafeApi.orders.getOpenByTable(targetTableId)
        if (!targetOrder) {
          toast({
            title: 'Hedef Masada Açık Sipariş Yok',
            description: 'Lütfen açık siparişi olan bir masa seçin.',
            variant: 'warning'
          })
          return
        }

        await cafeApi.orders.merge(mergeModal.sourceOrderId, targetOrder.id)
        const sourceTable = mergeModal.sourceTableId
          ? derived.tableMap.get(mergeModal.sourceTableId)
          : undefined
        const targetTable = derived.tableMap.get(targetTableId)

        closeMergeModal()
        await refetch()
        queryClient.invalidateQueries({ queryKey: ['order'] })
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['tables'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })

        toast({
          title: 'Birleştirme Başarılı',
          description: `${sourceTable?.name ?? 'Kaynak masa'} siparişi ${targetTable?.name ?? 'hedef masa'} ile birleştirildi.`,
          variant: 'success'
        })
      } catch (error) {
        toast({
          title: 'Birleştirme Hatası',
          description: getErrorMessage(error),
          variant: 'destructive'
        })
      } finally {
        resetProcessing()
      }
    },
    [mergeModal, derived.tableMap, closeMergeModal, refetch, resetProcessing, queryClient]
  )

  // Rendering Values
  const sourceTableName = transferModal.sourceTableId
    ? derived.tableMap.get(transferModal.sourceTableId)?.name
    : undefined
  const mergeSourceTableName = mergeModal.sourceTableId
    ? derived.tableMap.get(mergeModal.sourceTableId)?.name
    : undefined

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="sticky top-0 flex-none h-16 px-6 border-b bg-background/95 backdrop-blur shadow-sm z-10 w-full flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 min-w-0">
            <Coffee className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
            <h2 className="text-lg font-bold tracking-tight text-foreground truncate">Masalar</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-indigo-600 px-3 py-1.5 rounded-lg shadow-sm border border-indigo-300/20 text-white">
              <span className="text-base font-bold tabular-nums">{derived.occupiedCount}</span>
              <span className="text-[10px] font-bold tracking-wide uppercase">Dolu</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-600 px-3 py-1.5 rounded-lg shadow-sm border border-emerald-300/20 text-white">
              <span className="text-base font-bold tabular-nums">{derived.emptyCount}</span>
              <span className="text-[10px] font-bold tracking-wide uppercase">Boş</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        {isLoading ? (
          <div className={TABLE_GRID_CLASS}>
            {Array.from({ length: 16 }).map((_, i) => (
              <TableCardSkeleton key={i} />
            ))}
          </div>
        ) : tables.length > 0 ? (
          <div className={TABLE_GRID_CLASS}>
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

      {/* Modals */}
      <TableActionModal
        open={transferModal.open}
        onClose={closeTransferModal}
        title="Masa Transferi"
        description={`${sourceTableName ?? 'Seçili masa'} siparişini aktar`}
        selectLabel="Hedef masa seçin"
        accent="indigo"
        Icon={ArrowRightLeft}
        targetTables={transferTargets}
        emptyTitle="Boş masa bulunmuyor"
        emptyDescription="Tüm uygun masalar dolu veya kilitli görünüyor."
        onSelect={handleTransferToTable}
        isProcessing={processing.type === 'transfer'}
        processingTargetId={processing.type === 'transfer' ? processing.targetTableId : null}
      />

      <TableActionModal
        open={mergeModal.open}
        onClose={closeMergeModal}
        title="Masa Birleştirme"
        description={`${mergeSourceTableName ?? 'Seçili masa'} siparişini birleştir`}
        selectLabel="Birleştirilecek masayı seçin"
        accent="teal"
        Icon={Combine}
        targetTables={mergeTargets}
        emptyTitle="Birleştirilecek masa bulunmuyor"
        emptyDescription="Diğer uygun masalarda açık sipariş yok veya masa kilitli."
        onSelect={handleMergeWithTable}
        isProcessing={processing.type === 'merge'}
        processingTargetId={processing.type === 'merge' ? processing.targetTableId : null}
      />
    </div>
  )
}
