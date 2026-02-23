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

/* =========================
 * Types / Constants
 * ========================= */

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

const ACTION_CONFIG = {
  GENERATE_ZREPORT: {
    label: 'Z-RAPORU',
    color: 'text-purple-400',
    bg: 'bg-purple-400/5',
    category: 'system'
  },
  ARCHIVE_DATA: {
    label: 'ARŞİVLEME',
    color: 'text-orange-400',
    bg: 'bg-orange-400/5',
    category: 'system'
  },
  BACKUP_DATABASE: {
    label: 'YEDEKLEME',
    color: 'text-blue-400',
    bg: 'bg-blue-400/5',
    category: 'system'
  },
  END_OF_DAY: {
    label: 'GÜN SONU',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/5',
    category: 'system'
  },
  OPEN_TABLE: {
    label: 'MASA AÇILDI',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/5',
    category: 'operation'
  },
  CLOSE_TABLE: {
    label: 'MASA KAPATILDI',
    color: 'text-slate-400',
    bg: 'bg-slate-400/5',
    category: 'operation'
  },
  MOVE_TABLE: {
    label: 'TAŞIMA',
    color: 'text-amber-400',
    bg: 'bg-amber-400/5',
    category: 'operation'
  },
  ADD_ITEM: {
    label: 'SİPARİŞ',
    color: 'text-foreground',
    bg: 'bg-foreground/5',
    category: 'operation'
  },
  DELETE_PRODUCT: {
    label: 'ÜRÜN SİLME',
    color: 'text-red-500',
    bg: 'bg-red-500/5',
    category: 'operation'
  },
  DELETE_ORDER: {
    label: 'MASA BOŞALTMA',
    color: 'text-red-500',
    bg: 'bg-red-500/5',
    category: 'operation'
  },
  REMOVE_ITEM: {
    label: 'ÜRÜN İPTAL',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/5',
    category: 'operation'
  },
  CANCEL_ITEM: {
    label: 'İPTAL',
    color: 'text-rose-400',
    bg: 'bg-rose-400/5',
    category: 'operation'
  },
  ITEMS_PAID: {
    label: 'ÜRÜN ÖDEMESİ',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/5',
    category: 'operation'
  },
  PAYMENT_CASH: {
    label: 'NAKİT ÖDEME',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/5',
    category: 'operation'
  },
  PAYMENT_CARD: {
    label: 'KART ÖDEME',
    color: 'text-blue-500',
    bg: 'bg-blue-500/5',
    category: 'operation'
  },
  TRANSFER_TABLE: {
    label: 'MASA TAŞIMA',
    color: 'text-violet-500',
    bg: 'bg-violet-500/5',
    category: 'operation'
  },
  MERGE_TABLES: {
    label: 'MASA BİRLEŞTİRME',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/5',
    category: 'operation'
  },
  VACUUM: {
    label: 'OPTİMİZASYON',
    color: 'text-teal-500',
    bg: 'bg-teal-500/5',
    category: 'system'
  },
  SOFT_RESET: {
    label: 'SİSTEM SIFIRLAMA',
    color: 'text-rose-600',
    bg: 'bg-rose-600/5',
    category: 'system'
  },
  SECURITY_RESCUE: {
    label: 'GÜVENLİK SIFIRLAMA',
    color: 'text-red-600',
    bg: 'bg-red-600/5',
    category: 'system'
  },
  SECURITY_CHANGE_PIN: {
    label: 'PIN DEĞİŞİMİ',
    color: 'text-amber-500',
    bg: 'bg-amber-500/5',
    category: 'system'
  }
} as const satisfies Record<string, ActionMeta>

/* =========================
 * Regex Caching & Hooks
 * ========================= */

const LOG_PATTERNS = {
  ADD_ITEM: /(\d+)x (.*) eklendi/i,
  REMOVE_ITEM: /(\d+)x (.*) çıkarıldı/i,
  DETAIL_PARSER: /^(.+?(?:Ödenenler|alındı|boşaltıldı)):\s*(.+)$/i,
  ITEM_SPLIT: /,\s*/
} as const

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

/* =========================
 * Utils
 * ========================= */

function parseLogDetail(
  detail: string
): { summary: string; items: { qty: number; name: string }[] } | null {
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
    case 'yesterday': {
      const y = subDays(now, 1)
      return { start: startOfDay(y), end: endOfDay(y) }
    }
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
          const existingItem = currentGroup.groupItems?.find((item) => {
            const itemMatch = item.details.match(pattern)
            return itemMatch && itemMatch[2] === name
          })

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
        const qty = match ? parseInt(match[1], 10) : 1
        currentGroup = {
          ...log,
          groupCount: 1,
          groupItems: [{ details: log.details || '', count: qty }]
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
  return ACTION_CONFIG[action as keyof typeof ACTION_CONFIG]
}

/* =========================
 * Small memo components
 * ========================= */

const LogsHeader = memo(function LogsHeader({
  stats,
  searchTerm,
  onChangeSearch,
  onClearSearch
}: {
  stats: LogStats
  searchTerm: string
  onChangeSearch: (v: string) => void
  onClearSearch: () => void
}) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-8">
        <div className="flex md:flex items-center gap-6">
          {[
            { label: 'Bugün Toplam', value: stats.total, color: 'text-primary' },
            { label: 'Operasyon', value: stats.ops, color: 'text-emerald-500' },
            { label: 'Sistem', value: stats.sys, color: 'text-blue-500' }
          ].map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground/50 tracking-widest ">
                {s.label}
              </span>
              <span className={cn('text-lg font-black leading-none ', s.color)}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Filtrele..."
            value={searchTerm}
            onChange={(e) => onChangeSearch(e.target.value)}
            className="w-48 h-9 pl-9 pr-9 bg-muted/30 border-none rounded-lg text-sm transition-all focus:w-64 focus:bg-muted/50"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/60 transition-colors"
              aria-label="Filtreyi temizle"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground/60" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

const ControlBar = memo(function ControlBar({
  category,
  dateRange,
  onChangeCategory,
  onChangeDateRange
}: {
  category: LogCategory
  dateRange: DateRangeType
  onChangeCategory: (v: LogCategory) => void
  onChangeDateRange: (v: DateRangeType) => void
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 bg-card/30 p-1.5 rounded-xl border border-border/40">
      <div className="flex flex-1 gap-1">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeCategory(tab.id)}
            aria-pressed={category === tab.id}
            className={cn(
              'flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg transition-all',
              category === tab.id
                ? 'bg-foreground text-background shadow-lg'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            <tab.icon size={13} />
            {tab.label}
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
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
              dateRange === f.id
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
})

const ExpandedLogContent = memo(function ExpandedLogContent({
  log,
  createdAtDate,
  config
}: {
  log: GroupedLog
  createdAtDate: Date
  config?: ActionMeta
}) {
  const isGroup = Boolean(log.groupCount && log.groupCount > 1)

  return (
    <TableRow className="hover:bg-transparent border-0">
      <TableCell colSpan={5} className="p-0">
        <div className="overflow-hidden bg-muted/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-6 grid grid-cols-[1fr_auto] gap-6">
            <div className="min-w-0 space-y-4">
              <div className="bg-background/50 p-6 rounded-2xl border border-border/30 shadow-sm">
                <p className="text-[10px] font-black tracking-widest text-muted-foreground/40 leading-none mb-4">
                  SİPARİŞ DETAYI
                </p>

                {isGroup ? (
                  <div className="space-y-3">
                    {log.groupItems?.map((item, idx) => (
                      <p
                        key={`${log.id}-group-item-${idx}`}
                        className="text-base font-bold leading-relaxed text-foreground/90 border-b border-border/5 last:border-0 pb-2 last:pb-0 break-words"
                      >
                        {item.details}
                      </p>
                    ))}
                  </div>
                ) : (
                  (() => {
                    const parsed = parseLogDetail(log.details || '')
                    if (!parsed) {
                      return (
                        <p className="text-base font-bold leading-relaxed text-foreground/90 break-words">
                          {log.details || '-'}
                        </p>
                      )
                    }

                    return (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-foreground/70">{parsed.summary}</p>

                        <div className="space-y-1.5">
                          {parsed.items.map((item, idx) => (
                            <div
                              key={`${log.id}-parsed-${idx}`}
                              className="flex items-center gap-3 py-1.5 border-b border-border/5 last:border-0"
                            >
                              <span className="inline-flex items-center justify-center min-w-[2.5rem] h-6 px-2 rounded-lg bg-primary/10 text-primary text-xs font-black tabular-nums">
                                {item.qty}×
                              </span>
                              <span className="text-sm font-bold text-foreground/90">
                                {item.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 border-l border-border/30 pl-6 h-fit w-48 flex-shrink-0">
              <div className="flex gap-4 items-start">
                <div className={cn('p-2.5 rounded-xl shadow-sm', config?.bg || 'bg-muted')}>
                  <Activity size={18} className={config?.color || 'text-muted-foreground'} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground/50 leading-none mb-1.5 tracking-widest">
                    İŞLEM TİPİ
                  </span>
                  <span className="text-sm font-black text-foreground tracking-tight">
                    {config?.label || log.action}
                  </span>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-2.5 bg-background rounded-xl border border-border/20 shadow-sm">
                  <Clock size={18} className="text-primary/70" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground/50 leading-none mb-1.5 tracking-widest">
                    TARİH / SAAT
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {format(createdAtDate, 'dd MMMM yyyy', { locale: tr })}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(createdAtDate, 'HH:mm:ss')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
})

const LogRow = memo(function LogRow({
  log,
  dateRange,
  isExpanded,
  onToggle,
  index
}: {
  log: GroupedLog
  dateRange: DateRangeType
  isExpanded: boolean
  onToggle: (id: string) => void
  index: number
}) {
  const config = getActionMeta(log.action)
  const createdAtDate = useMemo(() => new Date(log.createdAt), [log.createdAt])
  const isGroup = Boolean(log.groupCount && log.groupCount > 1)

  const animationDelay = Math.min(index * 20, 300)

  return (
    <>
      <TableRow
        onClick={() => onToggle(log.id)}
        style={{ animationDelay: `${animationDelay}ms` }}
        className={cn(
          'group cursor-pointer transition-colors border-b border-border/10 opacity-0 animate-fade-in-row',
          isExpanded ? 'bg-primary/5' : 'odd:bg-background even:bg-muted/10 hover:bg-muted/30'
        )}
      >
        <TableCell className="pl-6 py-3 font-bold text-base">
          <div className="flex flex-col leading-tight">
            <span>{format(createdAtDate, 'HH:mm')}</span>
            {dateRange !== 'today' && (
              <span className="text-xs text-muted-foreground/60 font-medium">
                {format(createdAtDate, 'dd MMM', { locale: tr })}
              </span>
            )}
          </div>
        </TableCell>

        <TableCell className="py-3">
          <div
            className={cn(
              'text-sm font-black tracking-tight',
              config?.color || 'text-muted-foreground'
            )}
          >
            {config?.label || log.action}
          </div>
        </TableCell>

        <TableCell className="py-3">
          <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
            {log.tableName || 'Sistem'}
          </span>
        </TableCell>

        <TableCell className="py-3">
          <div className="text-sm text-muted-foreground/80 group-hover:text-foreground transition-colors line-clamp-1 font-medium">
            {isGroup ? (
              <span
                className={cn(
                  'font-bold',
                  log.action === 'ADD_ITEM' ? 'text-primary' : 'text-emerald-500'
                )}
              >
                {log.groupCount} ÜRÜN {log.action === 'ADD_ITEM' ? 'EKLENDİ' : 'İPTAL EDİLDİ'}
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

/* =========================
 * Main Component
 * ========================= */

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

  // ✅ Gerçek stats için backend endpoint varsa bunu kullan
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

      // fallback (endpoint yoksa)
      const now = new Date()
      const todayLogs = logs.filter((l) =>
        isWithinInterval(new Date(l.createdAt), {
          start: startOfDay(now),
          end: endOfDay(now)
        })
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
      // fallback local
      const now = new Date()
      const todayLogs = logs.filter((l) =>
        isWithinInterval(new Date(l.createdAt), {
          start: startOfDay(now),
          end: endOfDay(now)
        })
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

  // Filters changed -> reset + reload
  useEffect(() => {
    setExpandedLogId(null)
    setOffset(0)
    setHasMore(true)
    setLogs([])
    loadLogs(false)
  }, [dateRange, category, debouncedSearchTerm, loadLogs])

  // Stats refresh (ilk açılışta + logs değişince fallback için)
  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Infinite observer
  useEffect(() => {
    const target = observerTarget.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        if (!hasMoreRef.current) return
        if (isInitialLoadingRef.current || isFetchingMoreRef.current) return
        loadLogs(true)
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [loadLogs])

  const handleToggleRow = useCallback((id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
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

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <Table className="table-fixed w-full">
            <TableHeader className="sticky top-0 bg-background/60 backdrop-blur-3xl z-10 border-b border-border/40">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="w-[140px] pl-6 text-[10px] font-black tracking-[0.2em] text-muted-foreground/40">
                  SAAT
                </TableHead>
                <TableHead className="w-[180px] text-[10px] font-black tracking-[0.2em] text-muted-foreground/40">
                  İŞLEM TÜRÜ
                </TableHead>
                <TableHead className="w-[140px] text-[10px] font-black tracking-[0.2em] text-muted-foreground/40">
                  KONUM
                </TableHead>
                <TableHead className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/40">
                  AÇIKLAMA
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {isInitialLoading && logs.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-20">
                      <RefreshCw className="animate-spin" size={32} />
                      <span className="text-xs font-bold">Yükleniyor...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-20">
                      <History size={32} />
                      <span className="text-xs font-bold">Kayıt Bulunmuyor</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                groupedLogs.map((log, index) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    dateRange={dateRange}
                    isExpanded={expandedLogId === log.id}
                    onToggle={handleToggleRow}
                    index={index}
                  />
                ))
              )}

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

      {/* Global styles for animations */}
      <style>{`
        @keyframes fade-in-row {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-row {
          animation: fade-in-row 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
