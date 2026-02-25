import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cafeApi, type ActivityLog } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Activity,
  ChevronRight,
  Clock,
  History,
  Monitor,
  RefreshCw,
  Search,
  ShoppingCart,
  X
} from 'lucide-react'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays
} from 'date-fns'
import { tr } from 'date-fns/locale'

// ============================================================================
// Types & Constants
// ============================================================================

type LogCategory = 'all' | 'system' | 'operation'
type DateRangeType = 'today' | 'yesterday' | 'week' | 'month' | 'all'

type ActionMeta = {
  label: string
  color: string
  bg: string
  category: 'system' | 'operation'
}

type LogStats = {
  total: number
  sys: number
  ops: number
}

type GroupedLog = ActivityLog & {
  groupCount?: number
  groupItems?: { details: string; count: number }[]
}

type LogDetail = {
  summary: string
  items: { qty: number; name: string }[]
}

const LOGS_PAGE_SIZE = 50

const CATEGORY_TABS: { id: LogCategory; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Tümü', icon: History },
  { id: 'operation', label: 'Operasyon', icon: ShoppingCart },
  { id: 'system', label: 'Sistem', icon: Monitor }
]

const DATE_FILTERS: { id: DateRangeType; label: string }[] = [
  { id: 'today', label: 'Bugün' },
  { id: 'yesterday', label: 'Dün' },
  { id: 'week', label: 'Bu Hafta' },
  { id: 'month', label: 'Bu Ay' },
  { id: 'all', label: 'Tümü' }
]

const ACTION_CONFIG: Record<string, ActionMeta> = {
  GENERATE_ZREPORT: {
    label: 'Z-Raporu',
    color: 'text-purple-400',
    bg: 'bg-purple-400/5',
    category: 'system'
  },
  ARCHIVE_DATA: {
    label: 'Arşivleme',
    color: 'text-orange-400',
    bg: 'bg-orange-400/5',
    category: 'system'
  },
  BACKUP_DATABASE: {
    label: 'Yedekleme',
    color: 'text-blue-400',
    bg: 'bg-blue-400/5',
    category: 'system'
  },
  END_OF_DAY: {
    label: 'Gün Sonu',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/5',
    category: 'system'
  },
  OPEN_TABLE: {
    label: 'Masa Açıldı',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/5',
    category: 'operation'
  },
  CLOSE_TABLE: {
    label: 'Masa Kapatıldı',
    color: 'text-slate-400',
    bg: 'bg-slate-400/5',
    category: 'operation'
  },
  MOVE_TABLE: {
    label: 'Taşıma',
    color: 'text-amber-400',
    bg: 'bg-amber-400/5',
    category: 'operation'
  },
  ADD_ITEM: {
    label: 'Sipariş',
    color: 'text-foreground',
    bg: 'bg-foreground/5',
    category: 'operation'
  },
  DELETE_PRODUCT: {
    label: 'Ürün Silme',
    color: 'text-red-500',
    bg: 'bg-red-500/5',
    category: 'operation'
  },
  DELETE_ORDER: {
    label: 'Masa Boşaltma',
    color: 'text-red-500',
    bg: 'bg-red-500/5',
    category: 'operation'
  },
  REMOVE_ITEM: {
    label: 'Ürün İptal',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/5',
    category: 'operation'
  },
  CANCEL_ITEM: {
    label: 'İptal',
    color: 'text-rose-400',
    bg: 'bg-rose-400/5',
    category: 'operation'
  },
  ITEMS_PAID: {
    label: 'Ürün Ödemesi',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/5',
    category: 'operation'
  },
  PAYMENT_CASH: {
    label: 'Nakit Ödeme',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/5',
    category: 'operation'
  },
  PAYMENT_CARD: {
    label: 'Kart Ödeme',
    color: 'text-blue-500',
    bg: 'bg-blue-500/5',
    category: 'operation'
  },
  TRANSFER_TABLE: {
    label: 'Masa Taşıma',
    color: 'text-violet-500',
    bg: 'bg-violet-500/5',
    category: 'operation'
  },
  MERGE_TABLES: {
    label: 'Masa Birleştirme',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/5',
    category: 'operation'
  },
  VACUUM: {
    label: 'Optimizasyon',
    color: 'text-teal-500',
    bg: 'bg-teal-500/5',
    category: 'system'
  },
  SOFT_RESET: {
    label: 'Sistem Sıfırlama',
    color: 'text-rose-600',
    bg: 'bg-rose-600/5',
    category: 'system'
  },
  SECURITY_RESCUE: {
    label: 'Güvenlik Sıfırlama',
    color: 'text-red-600',
    bg: 'bg-red-600/5',
    category: 'system'
  },
  SECURITY_CHANGE_PIN: {
    label: 'Pin Değişimi',
    color: 'text-amber-500',
    bg: 'bg-amber-500/5',
    category: 'system'
  }
}

const LOG_PATTERNS = {
  ADD_ITEM: /(\d+)x (.*) eklendi/i,
  REMOVE_ITEM: /(\d+)x (.*) çıkarıldı/i,
  DETAIL_PARSER: /^(.+?(?:Ödenenler|alındı|boşaltıldı)):\s*(.+)$/i,
  ITEM_SPLIT: /,\s*/
} as const

// ============================================================================
// Styles (Extracted for clean JSX)
// ============================================================================

const STYLES = {
  container: 'h-full flex flex-col p-6 space-y-4',
  searchInput:
    'w-48 h-9 pl-9 pr-9 bg-white dark:bg-zinc-900 border-2 rounded-xl text-xs font-bold transition-all focus:w-64 focus:ring-0',
  filterBtn:
    'flex items-center gap-2 px-5 py-2 text-xs font-black tracking-tight rounded-xl transition-all',
  filterBtnActive: 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-black shadow-lg',
  filterBtnInactive: 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800',
  dateBtn: 'px-4 py-2 text-[11px] font-black tracking-tight rounded-xl transition-all',
  dateBtnActive: 'bg-primary text-white shadow-lg',
  dateBtnInactive: 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800',
  tableHeader: 'sticky top-0 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-sm z-10 border-b-2',
  tableHeadCell: 'text-[10px] font-black tracking-[0.2em] text-muted-foreground/40',
  rowBase:
    'group cursor-pointer transition-colors border-b border-zinc-200/50 dark:border-zinc-800/50 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both',
  rowExpanded: 'bg-primary/5',
  rowCollapsed: 'hover:bg-zinc-200/20 dark:hover:bg-zinc-800/20',
  expandedContainer:
    'h-full bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200/60 dark:border-zinc-800/60 animate-in slide-in-from-top-2 duration-300 overflow-hidden',
  emptyLoadingCell: 'h-48 text-center hover:bg-transparent border-0'
} as const

// ============================================================================
// Hooks & Pure Utils
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function parseLogDetail(detail: string): LogDetail | null {
  const match = detail.match(LOG_PATTERNS.DETAIL_PARSER)
  if (!match) return null

  const summary = `${match[1].trim()}:`
  const items = match[2]
    .split(LOG_PATTERNS.ITEM_SPLIT)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(\d+)x\s+(.+)$/i)
      return m ? { qty: parseInt(m[1], 10), name: m[2] } : { qty: 1, name: s }
    })
  return { summary, items }
}

function getDateRangeBounds(dateRange: DateRangeType): { start?: Date; end?: Date } {
  const now = new Date()
  switch (dateRange) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'yesterday':
      return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) }
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 })
      }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'all':
    default:
      return {}
  }
}

function groupActivityLogs(logs: ActivityLog[]): GroupedLog[] {
  if (logs.length === 0) return []

  const grouped: GroupedLog[] = []
  let currentGroup: GroupedLog | null = null
  const GROUP_WINDOW_MS = 2 * 60 * 1000 // 2 minutes

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i]

    if (log.action === 'ADD_ITEM' || log.action === 'REMOVE_ITEM') {
      const actionWord = log.action === 'ADD_ITEM' ? 'eklendi' : 'çıkarıldı'
      const pattern = log.action === 'ADD_ITEM' ? LOG_PATTERNS.ADD_ITEM : LOG_PATTERNS.REMOVE_ITEM
      const canMerge =
        currentGroup &&
        currentGroup.action === log.action &&
        currentGroup.tableName === log.tableName &&
        Math.abs(new Date(currentGroup.createdAt).getTime() - new Date(log.createdAt).getTime()) <
          GROUP_WINDOW_MS

      if (canMerge && currentGroup) {
        currentGroup.groupCount = (currentGroup.groupCount || 1) + 1
        const match = log.details?.match(pattern)
        if (match) {
          const qty = parseInt(match[1], 10)
          const name = match[2]
          const existingItem = currentGroup.groupItems?.find(
            (item) => item.details.match(pattern)?.[2] === name
          )
          if (existingItem) {
            existingItem.count += qty
            existingItem.details = `${existingItem.count}x ${name} ${actionWord}`
          } else {
            currentGroup.groupItems?.push({ details: log.details || '', count: qty })
          }
        } else {
          currentGroup.groupItems?.push({ details: log.details || '', count: 1 })
        }
      } else {
        const match = log.details?.match(pattern)
        currentGroup = {
          ...log,
          groupCount: 1,
          groupItems: [{ details: log.details || '', count: match ? parseInt(match[1], 10) : 1 }]
        }
        grouped.push(currentGroup)
      }
    } else {
      currentGroup = null
      grouped.push(log)
    }
  }
  return grouped
}

function getActionMeta(action: string): ActionMeta | undefined {
  return ACTION_CONFIG[action]
}

// ============================================================================
// Sub-Components
// ============================================================================

interface LogsHeaderProps {
  stats: LogStats
  searchTerm: string
  onChangeSearch: (v: string) => void
  onClearSearch: () => void
}

const LogsHeader = memo(function LogsHeader({
  stats,
  searchTerm,
  onChangeSearch,
  onClearSearch
}: LogsHeaderProps): React.JSX.Element {
  const STAT_CARDS = [
    { label: 'Bugün Toplam', value: stats.total, color: 'text-primary' },
    { label: 'Operasyon', value: stats.ops, color: 'text-emerald-500' },
    { label: 'Sistem', value: stats.sys, color: 'text-blue-500' }
  ]

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-6">
          {STAT_CARDS.map((s) => (
            <div key={s.label} className="flex flex-col min-w-[100px]">
              <span className="text-[11px] font-black text-zinc-400 tracking-widest mb-1">
                {s.label}
              </span>
              <span className={cn('text-2xl font-black leading-none ', s.color)}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Kayıtlarda ara..."
            value={searchTerm}
            onChange={(e) => onChangeSearch(e.target.value)}
            className={STYLES.searchInput}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/60 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground/60" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

interface ControlBarProps {
  category: LogCategory
  dateRange: DateRangeType
  onChangeCategory: (v: LogCategory) => void
  onChangeDateRange: (v: DateRangeType) => void
}

const ControlBar = memo(function ControlBar({
  category,
  dateRange,
  onChangeCategory,
  onChangeDateRange
}: ControlBarProps): React.JSX.Element {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="flex flex-1 gap-1">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeCategory(tab.id)}
            aria-pressed={category === tab.id}
            className={cn(
              STYLES.filterBtn,
              category === tab.id ? STYLES.filterBtnActive : STYLES.filterBtnInactive
            )}
          >
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 h-fit">
        {DATE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChangeDateRange(f.id)}
            aria-pressed={dateRange === f.id}
            className={cn(
              STYLES.dateBtn,
              dateRange === f.id ? STYLES.dateBtnActive : STYLES.dateBtnInactive
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
})

interface ExpandedLogContentProps {
  log: GroupedLog
  createdAtDate: Date
  config?: ActionMeta
}

// === Group vs Single Renderer Refactored ===
const ExpandedLogContent = memo(function ExpandedLogContent({
  log,
  createdAtDate,
  config
}: ExpandedLogContentProps): React.JSX.Element {
  const isGroup = Boolean(log.groupCount && log.groupCount > 1)

  const renderGroupedItems = (): React.JSX.Element => (
    <div className="space-y-1">
      {log.groupItems?.map((item: { details: string; count: number }, idx: number) => (
        <p
          key={`${log.id}-group-item-${idx}`}
          className="text-[15px] font-bold leading-relaxed text-foreground/90 border-b border-zinc-100 dark:border-zinc-800/10 last:border-0 pb-1.5 last:pb-0 break-words"
        >
          {item.details}
        </p>
      ))}
    </div>
  )

  const renderSingleItem = (): React.JSX.Element => {
    const parsed = parseLogDetail(log.details || '')
    if (!parsed) {
      return (
        <p className="text-base font-bold leading-relaxed text-foreground/90 break-words">
          {log.details || '-'}
        </p>
      )
    }

    return (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-foreground/70 tracking-tight">{parsed.summary}</p>
        <div className="space-y-1">
          {parsed.items.map((item: { qty: number; name: string }, idx: number) => (
            <div
              key={`${log.id}-parsed-${idx}`}
              className="flex items-center gap-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800/10 last:border-0"
            >
              <span className="inline-flex items-center justify-center min-w-[3rem] h-7 px-2 rounded-xl bg-primary/10 text-primary text-[13px] font-black tabular-nums scale-90 -ml-1">
                {item.qty}×
              </span>
              <span className="text-[15px] font-bold text-foreground/90">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <TableRow className="hover:bg-transparent border-0">
      <TableCell colSpan={5} className="p-0">
        <div className={STYLES.expandedContainer}>
          <div className="px-6 py-4 grid grid-cols-[1fr_240px] gap-6">
            <div className="min-w-0 space-y-3">
              <p className="text-[11px] font-black tracking-widest text-zinc-400 leading-none">
                Sipariş Detayı
              </p>
              {isGroup ? renderGroupedItems() : renderSingleItem()}
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-black tracking-widest text-zinc-400 leading-none">
                İşlem Bilgileri
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 p-2.5 rounded-2xl shadow-sm">
                  <div className={cn('p-2 rounded-xl', config?.bg || 'bg-muted')}>
                    <Activity size={16} className={config?.color || 'text-muted-foreground'} />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-muted-foreground/50 tracking-tight mb-0.5">
                      Tip
                    </span>
                    <span className="text-sm font-black text-foreground tracking-tight">
                      {config?.label || log.action}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 p-2.5 rounded-2xl shadow-sm">
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-primary">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-muted-foreground/50 tracking-tight mb-0.5">
                      Zaman
                    </span>
                    <span className="text-sm font-bold text-foreground block leading-tight">
                      {format(createdAtDate, 'dd MMMM yyyy', { locale: tr })}
                    </span>
                    <span className="text-xs font-medium text-zinc-400">
                      Saat: {format(createdAtDate, 'HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
})

interface LogRowProps {
  log: GroupedLog
  dateRange: DateRangeType
  isExpanded: boolean
  onToggle: (id: string) => void
  index: number
}

const LogRow = memo(function LogRow({
  log,
  dateRange,
  isExpanded,
  onToggle,
  index
}: LogRowProps): React.JSX.Element {
  const config = getActionMeta(log.action)
  const createdAtDate = useMemo(() => new Date(log.createdAt), [log.createdAt])
  const isGroup = Boolean(log.groupCount && log.groupCount > 1)

  // Custom CSS ile yazılan animasyon yerine tailwind animate-in kullanılarak daha güvenli delay eklendi.
  const style = { animationDelay: `${Math.min(index * 20, 300)}ms` }

  return (
    <>
      <TableRow
        onClick={() => onToggle(log.id)}
        style={style}
        className={cn(STYLES.rowBase, isExpanded ? STYLES.rowExpanded : STYLES.rowCollapsed)}
      >
        <TableCell className="pl-6 py-2.5 font-bold text-base">
          <div className="flex flex-col leading-tight">
            <span>{format(createdAtDate, 'HH:mm')}</span>
            {dateRange !== 'today' && (
              <span className="text-[11px] text-muted-foreground/60 font-medium">
                {format(createdAtDate, 'dd MMM', { locale: tr })}
              </span>
            )}
          </div>
        </TableCell>

        <TableCell className="py-2.5">
          <div
            className={cn(
              'text-sm font-black tracking-tight',
              config?.color || 'text-muted-foreground'
            )}
          >
            {config?.label || log.action}
          </div>
        </TableCell>

        <TableCell className="py-2.5">
          <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
            {log.tableName || 'Sistem'}
          </span>
        </TableCell>

        <TableCell className="py-2.5">
          <div className="text-sm text-muted-foreground/80 group-hover:text-foreground transition-colors line-clamp-1 font-medium">
            {isGroup ? (
              <span
                className={cn(
                  'font-bold',
                  log.action === 'ADD_ITEM' ? 'text-primary' : 'text-emerald-500'
                )}
              >
                {log.groupCount} Ürün {log.action === 'ADD_ITEM' ? 'Eklendi' : 'İptal Edildi'}
              </span>
            ) : (
              log.details
            )}
          </div>
        </TableCell>

        <TableCell className="py-2 pr-4">
          <ChevronRight
            size={14}
            className={cn(
              'opacity-0 group-hover:opacity-40 transition-all',
              isExpanded && 'rotate-90 opacity-100 text-primary'
            )}
          />
        </TableCell>
      </TableRow>

      {isExpanded && <ExpandedLogContent log={log} createdAtDate={createdAtDate} config={config} />}
    </>
  )
})

// ============================================================================
// Main Component
// ============================================================================

export function LogsTab(): React.JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<LogStats>({ total: 0, sys: 0, ops: 0 })
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isStatsLoading, setIsStatsLoading] = useState(false)
  const [category, setCategory] = useState<LogCategory>('all')
  const [dateRange, setDateRange] = useState<DateRangeType>('today')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 400)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const observerTarget = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)
  const statsRequestIdRef = useRef(0)

  const offsetRef = useRef(offset)
  const hasMoreRef = useRef(hasMore)
  const isInitialLoadingRef = useRef(isInitialLoading)
  const isFetchingMoreRef = useRef(isFetchingMore)

  offsetRef.current = offset
  hasMoreRef.current = hasMore
  isInitialLoadingRef.current = isInitialLoading
  isFetchingMoreRef.current = isFetchingMore

  const groupedLogs = useMemo(() => groupActivityLogs(logs), [logs])

  const loadLogs = useCallback(
    async (isLoadMore = false) => {
      if (isInitialLoadingRef.current || isFetchingMoreRef.current) return
      if (isLoadMore && !hasMoreRef.current) return

      const requestId = ++requestIdRef.current

      try {
        if (isLoadMore) setIsFetchingMore(true)
        else setIsInitialLoading(true)

        const { start, end } = getDateRangeBounds(dateRange)
        const currentOffset = isLoadMore ? offsetRef.current : 0
        const data = await cafeApi.logs.getRecent(
          LOGS_PAGE_SIZE,
          start?.toISOString(),
          end?.toISOString(),
          currentOffset,
          debouncedSearchTerm,
          category
        )

        if (requestId !== requestIdRef.current) return

        if (isLoadMore) {
          setLogs((prev) => [...prev, ...data])
          setOffset((prev) => prev + LOGS_PAGE_SIZE)
        } else {
          setLogs(data)
          setOffset(LOGS_PAGE_SIZE)
        }

        setHasMore(data.length === LOGS_PAGE_SIZE)
      } catch (error) {
        console.error('Failed to load logs:', error)
      } finally {
        if (requestId === requestIdRef.current) {
          setIsInitialLoading(false)
          setIsFetchingMore(false)
        }
      }
    },
    [dateRange, category, debouncedSearchTerm]
  )

  const loadStats = useCallback(async () => {
    const requestId = ++statsRequestIdRef.current
    setIsStatsLoading(true)

    try {
      const data = await cafeApi.logs.getStatsToday()
      if (requestId !== statsRequestIdRef.current) return
      if (data) {
        setStats(data)
        return
      }

      // Fallback
      const now = new Date()
      const todayLogs = logs.filter((l) =>
        isWithinInterval(new Date(l.createdAt), { start: startOfDay(now), end: endOfDay(now) })
      )
      const sysCount = todayLogs.filter(
        (l) => getActionMeta(l.action)?.category === 'system'
      ).length
      setStats({
        total: todayLogs.length,
        sys: sysCount,
        ops: Math.max(0, todayLogs.length - sysCount)
      })
    } catch {
      // Local Fallback
      const now = new Date()
      const todayLogs = logs.filter((l) =>
        isWithinInterval(new Date(l.createdAt), { start: startOfDay(now), end: endOfDay(now) })
      )
      const sysCount = todayLogs.filter(
        (l) => getActionMeta(l.action)?.category === 'system'
      ).length
      setStats({
        total: todayLogs.length,
        sys: sysCount,
        ops: Math.max(0, todayLogs.length - sysCount)
      })
    } finally {
      if (requestId === statsRequestIdRef.current) setIsStatsLoading(false)
    }
  }, [logs])

  useEffect(() => {
    setExpandedLogId(null)
    setOffset(0)
    setHasMore(true)
    setLogs([])
    loadLogs(false)
  }, [dateRange, category, debouncedSearchTerm, loadLogs])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    const target = observerTarget.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !entries[0]?.isIntersecting ||
          !hasMoreRef.current ||
          isInitialLoadingRef.current ||
          isFetchingMoreRef.current
        )
          return
        loadLogs(true)
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [loadLogs])

  // --- Render Helpers ---

  const renderTableBody = (): React.JSX.Element => {
    if (isInitialLoading && logs.length === 0) {
      return (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className={STYLES.emptyLoadingCell}>
            <div className="flex flex-col items-center justify-center space-y-2 opacity-20">
              <RefreshCw className="animate-spin" size={32} />
              <span className="text-xs font-bold">Yükleniyor...</span>
            </div>
          </TableCell>
        </TableRow>
      )
    }

    if (logs.length === 0) {
      return (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className={STYLES.emptyLoadingCell}>
            <div className="flex flex-col items-center justify-center space-y-2 opacity-20">
              <History size={32} />
              <span className="text-xs font-bold">Kayıt Bulunmuyor</span>
            </div>
          </TableCell>
        </TableRow>
      )
    }

    return (
      <>
        {groupedLogs.map((log, index) => (
          <LogRow
            key={log.id}
            log={log}
            dateRange={dateRange}
            isExpanded={expandedLogId === log.id}
            onToggle={(id: string) => setExpandedLogId((prev) => (prev === id ? null : id))}
            index={index}
          />
        ))}
      </>
    )
  }

  return (
    <div className={STYLES.container}>
      <LogsHeader
        stats={stats}
        searchTerm={searchTerm}
        onChangeSearch={setSearchTerm}
        onClearSearch={() => setSearchTerm('')}
      />
      <ControlBar
        category={category}
        dateRange={dateRange}
        onChangeCategory={setCategory}
        onChangeDateRange={setDateRange}
      />

      <div className="flex-1 min-h-0 bg-transparent">
        <ScrollArea className="h-full">
          <Table className="table-fixed w-full">
            <TableHeader className={STYLES.tableHeader}>
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className={cn('w-[140px] pl-6', STYLES.tableHeadCell)}>SAAT</TableHead>
                <TableHead className={cn('w-[180px]', STYLES.tableHeadCell)}>İŞLEM TÜRÜ</TableHead>
                <TableHead className={cn('w-[140px]', STYLES.tableHeadCell)}>KONUM</TableHead>
                <TableHead className={STYLES.tableHeadCell}>AÇIKLAMA</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {renderTableBody()}

              {/* Intersection Observer Target (Infinite Scroll) */}
              <TableRow className="hover:bg-transparent border-0">
                <TableCell colSpan={5} className="p-0">
                  <div ref={observerTarget} className="h-4 w-full" />
                  {(isFetchingMore || isStatsLoading) && logs.length > 0 && (
                    <div className="flex justify-center p-4">
                      <RefreshCw className="animate-spin text-muted-foreground" size={20} />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  )
}
