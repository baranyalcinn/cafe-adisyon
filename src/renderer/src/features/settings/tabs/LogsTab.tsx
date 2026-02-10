import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import {
  History,
  Monitor,
  ShoppingCart,
  RefreshCw,
  Search,
  Activity,
  ChevronRight,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { motion } from 'framer-motion'
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  isWithinInterval
} from 'date-fns'
import { tr } from 'date-fns/locale'

// Category definitions
type LogCategory = 'all' | 'system' | 'operation'
type DateRangeType = 'today' | 'yesterday' | 'week' | 'month' | 'all'

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

const ACTION_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  GENERATE_ZREPORT: {
    label: 'Z-Raporu',
    color: 'text-purple-400',
    dot: 'bg-purple-400',
    bg: 'bg-purple-400/5'
  },
  ARCHIVE_DATA: {
    label: 'Arşivleme',
    color: 'text-orange-400',
    dot: 'bg-orange-400',
    bg: 'bg-orange-400/5'
  },
  BACKUP_DATABASE: {
    label: 'Yedekleme',
    color: 'text-blue-400',
    dot: 'bg-blue-400',
    bg: 'bg-blue-400/5'
  },
  END_OF_DAY: {
    label: 'Gün Sonu',
    color: 'text-indigo-400',
    dot: 'bg-indigo-400',
    bg: 'bg-indigo-400/5'
  },
  OPEN_TABLE: {
    label: 'Masa Açıldı',
    color: 'text-emerald-400',
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-400/5'
  },
  CLOSE_TABLE: {
    label: 'Masa Kapatıldı',
    color: 'text-slate-400',
    dot: 'bg-slate-400',
    bg: 'bg-slate-400/5'
  },
  MOVE_TABLE: {
    label: 'Taşıma',
    color: 'text-amber-400',
    dot: 'bg-amber-400',
    bg: 'bg-amber-400/5'
  },
  ADD_ITEM: {
    label: 'Sipariş',
    color: 'text-foreground',
    dot: 'bg-foreground',
    bg: 'bg-foreground/5'
  },
  DELETE_PRODUCT: {
    label: 'Ürün Silme',
    color: 'text-red-500',
    dot: 'bg-red-500',
    bg: 'bg-red-500/5'
  },
  DELETE_ORDER: {
    label: 'Masa Boşaltma',
    color: 'text-red-500',
    dot: 'bg-red-500',
    bg: 'bg-red-500/5'
  },
  REMOVE_ITEM: {
    label: 'Ürün İptal',
    color: 'text-emerald-400',
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-400/5'
  },
  CANCEL_ITEM: { label: 'İptal', color: 'text-rose-400', dot: 'bg-rose-400', bg: 'bg-rose-400/5' },
  ITEMS_PAID: {
    label: 'Ürün Ödemesi',
    color: 'text-emerald-500',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-500/5'
  },
  PAYMENT_CASH: {
    label: 'Nakit Ödeme',
    color: 'text-emerald-500',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-500/5'
  },
  PAYMENT_CARD: {
    label: 'Kart Ödeme',
    color: 'text-blue-500',
    dot: 'bg-blue-500',
    bg: 'bg-blue-500/5'
  }
}

const SYSTEM_ACTIONS = [
  'GENERATE_ZREPORT',
  'BACKUP_DATABASE',
  'ARCHIVE_DATA',
  'END_OF_DAY',
  'VACUUM',
  'SOFT_RESET'
]

export function LogsTab(): React.JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [category, setCategory] = useState<LogCategory>('all')
  const [dateRange, setDateRange] = useState<DateRangeType>('today')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const observerTarget = useRef<HTMLDivElement>(null)
  const LIMIT = 50

  // Refs for mutable state accessed inside the stable callback
  const offsetRef = useRef(offset)
  const hasMoreRef = useRef(hasMore)
  const isLoadingRef = useRef(isLoading)

  // Keep refs in sync with state
  offsetRef.current = offset
  hasMoreRef.current = hasMore
  isLoadingRef.current = isLoading

  const loadLogs = useCallback(
    async (isLoadMore = false) => {
      if (isLoadingRef.current) return // Prevent double fetch

      if (!isLoadMore) setIsLoading(true)

      try {
        let start: Date | undefined
        let end: Date | undefined
        const now = new Date()

        switch (dateRange) {
          case 'today':
            start = startOfDay(now)
            end = endOfDay(now)
            break
          case 'yesterday':
            start = startOfDay(subDays(now, 1))
            end = endOfDay(subDays(now, 1))
            break
          case 'week':
            start = startOfWeek(now, { weekStartsOn: 1 })
            end = endOfWeek(now, { weekStartsOn: 1 })
            break
          case 'month':
            start = startOfMonth(now)
            end = endOfMonth(now)
            break
        }

        const currentOffset = isLoadMore ? offsetRef.current : 0
        const data = await cafeApi.logs.getRecent(
          LIMIT,
          start?.toISOString(),
          end?.toISOString(),
          currentOffset,
          debouncedSearchTerm,
          category
        )

        if (isLoadMore) {
          setLogs((prev) => [...prev, ...data])
          setOffset((prev) => prev + LIMIT)
        } else {
          setLogs(data)
          setOffset(LIMIT)
        }

        setHasMore(data.length === LIMIT)
      } catch (error) {
        console.error('Failed to load logs:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [dateRange, category, debouncedSearchTerm]
  )

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset and reload when filters change
  useEffect(() => {
    setOffset(0)
    setHasMore(true)
    setLogs([])
    loadLogs(false)
  }, [dateRange, category, debouncedSearchTerm, loadLogs])

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
          loadLogs(true)
        }
      },
      { threshold: 1.0 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [loadLogs])

  const stats = useMemo(() => {
    const todayLogs = logs.filter((l) =>
      isWithinInterval(new Date(l.createdAt), {
        start: startOfDay(new Date()),
        end: endOfDay(new Date())
      })
    )

    const sysCount = todayLogs.filter((l) => SYSTEM_ACTIONS.includes(l.action)).length

    return {
      total: todayLogs.length,
      sys: sysCount,
      ops: Math.max(0, todayLogs.length - sysCount)
    }
  }, [logs])

  // Client-side filtering removed as it is now server-side
  const filteredLogs = logs

  const groupedLogs = useMemo(() => {
    if (filteredLogs.length === 0) return []

    const grouped: (ActivityLog & {
      groupCount?: number
      groupItems?: { details: string; count: number }[]
    })[] = []
    let currentGroup:
      | (ActivityLog & { groupCount?: number; groupItems?: { details: string; count: number }[] })
      | null = null

    filteredLogs.forEach((log) => {
      if (log.action === 'ADD_ITEM') {
        if (
          currentGroup &&
          currentGroup.action === 'ADD_ITEM' &&
          currentGroup.tableName === log.tableName &&
          Math.abs(new Date(currentGroup.createdAt).getTime() - new Date(log.createdAt).getTime()) <
            2 * 60 * 1000
        ) {
          currentGroup.groupCount = (currentGroup.groupCount || 1) + 1

          // Aggregate by product name
          const match = log.details?.match(/(\d+)x (.*) eklendi/)
          if (match) {
            const qty = parseInt(match[1])
            const name = match[2]
            const existingItem = currentGroup.groupItems?.find((i) => {
              const m = i.details.match(/(\d+)x (.*) eklendi/)
              return m && m[2] === name
            })

            if (existingItem) {
              existingItem.count += qty
              existingItem.details = `${existingItem.count}x ${name} eklendi`
            } else {
              currentGroup.groupItems?.push({ details: log.details || '', count: qty })
            }
          } else {
            currentGroup.groupItems?.push({ details: log.details || '', count: 1 })
          }
        } else {
          const match = log.details?.match(/(\d+)x (.*) eklendi/)
          const qty = match ? parseInt(match[1]) : 1
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
    })

    return grouped
  }, [filteredLogs])

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      {/* Minimal Header Bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-8">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Geçmiş</h2>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              İşlem Kayıtları
            </p>
          </div>

          <div className="hidden md:flex items-center gap-6 border-l pl-8 border-border/50">
            {[
              { label: 'Bugün Toplam', value: stats.total, color: 'text-primary' },
              { label: 'Operasyon', value: stats.ops, color: 'text-emerald-500' },
              { label: 'Sistem', value: stats.sys, color: 'text-blue-500' }
            ].map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-muted-foreground/50 tracking-widest">
                  {s.label}
                </span>
                <span className={cn('text-lg font-black leading-none', s.color)}>{s.value}</span>
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 h-9 pl-9 bg-muted/30 border-none rounded-lg text-sm transition-all focus:w-64 focus:bg-muted/50"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadLogs(false)}
            disabled={isLoading}
            className="h-9 w-9 rounded-lg hover:bg-muted/50"
          >
            <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Modern Control Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card/30 p-1.5 rounded-xl border border-border/40">
        <div className="flex flex-1 gap-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
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
              onClick={() => setDateRange(f.id)}
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

      {/* Background-Integrated Table */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 bg-background/60 backdrop-blur-3xl z-10 border-b border-border/40">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="w-[140px] pl-6 text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/40">
                  SAAT
                </TableHead>
                <TableHead className="w-[180px] text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/40">
                  İŞLEM TÜRÜ
                </TableHead>
                <TableHead className="w-[140px] text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/40">
                  KONUM
                </TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/40">
                  AÇIKLAMA
                </TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && logs.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-20">
                      <RefreshCw className="animate-spin" size={32} />
                      <span className="text-xs font-bold">Yükleniyor...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-20">
                      <History size={32} />
                      <span className="text-xs font-bold">Kayıt Bulunmuyor</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                groupedLogs.map((log) => {
                  const config = ACTION_CONFIG[log.action]
                  const isExpanded = expandedLogId === log.id
                  const isGroup = log.groupCount && log.groupCount > 1
                  return (
                    <React.Fragment key={log.id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.05 }}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={cn(
                          'group cursor-pointer transition-colors border-b border-border/10',
                          isExpanded ? 'bg-primary/5' : 'hover:bg-muted/30'
                        )}
                      >
                        <TableCell className="pl-6 py-3 font-bold text-base">
                          <div className="flex flex-col leading-tight">
                            <span>{format(new Date(log.createdAt), 'HH:mm')}</span>
                            {dateRange !== 'today' && (
                              <span className="text-xs text-muted-foreground/60 font-medium">
                                {format(new Date(log.createdAt), 'dd MMM', { locale: tr })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div
                            className={cn(
                              'text-sm font-black uppercase tracking-tight',
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
                          <span className="text-sm text-muted-foreground/80 group-hover:text-foreground transition-colors line-clamp-1 font-medium">
                            {isGroup ? (
                              <span className="text-primary font-bold">
                                {log.groupCount} Ürün Eklendi
                              </span>
                            ) : (
                              log.details
                            )}
                          </span>
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
                      </motion.tr>

                      {isExpanded && (
                        <TableRow className="hover:bg-transparent border-0">
                          <TableCell colSpan={5} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-muted/10"
                            >
                              <div className="p-6 grid grid-cols-3 gap-6">
                                <div className="col-span-2 space-y-4">
                                  <div className="bg-background/50 p-6 rounded-2xl border border-border/30 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none mb-4">
                                      Sipariş Detayı
                                    </p>
                                    {isGroup ? (
                                      <div className="space-y-3">
                                        {log.groupItems?.map((item, idx) => (
                                          <p
                                            key={idx}
                                            className="text-base font-bold leading-relaxed text-foreground/90 border-b border-border/5 last:border-0 pb-2 last:pb-0"
                                          >
                                            {item.details}
                                          </p>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-base font-bold leading-relaxed text-foreground/90">
                                        {log.details}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 border-l border-border/30 pl-6 h-fit">
                                  {/* Action Type */}
                                  <div className="flex gap-4 items-start">
                                    <div
                                      className={cn(
                                        'p-2.5 rounded-xl shadow-sm',
                                        config?.bg || 'bg-muted'
                                      )}
                                    >
                                      <Activity
                                        size={18}
                                        className={config?.color || 'text-muted-foreground'}
                                      />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black uppercase text-muted-foreground/50 leading-none mb-1.5 tracking-widest">
                                        İşlem Tipi
                                      </span>
                                      <span className="text-sm font-black text-foreground uppercase tracking-tight">
                                        {config?.label || log.action}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Date and Time */}
                                  <div className="flex gap-4 items-start">
                                    <div className="p-2.5 bg-background rounded-xl border border-border/20 shadow-sm">
                                      <Clock size={18} className="text-primary/70" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black uppercase text-muted-foreground/50 leading-none mb-1.5 tracking-widest">
                                        Tarih / Saat
                                      </span>
                                      <span className="text-sm font-bold text-foreground">
                                        {format(new Date(log.createdAt), 'dd MMMM yyyy', {
                                          locale: tr
                                        })}
                                      </span>
                                      <span className="text-xs font-medium text-muted-foreground">
                                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })
              )}
              <TableRow className="hover:bg-transparent border-0">
                <TableCell colSpan={5} className="p-0">
                  <div ref={observerTarget} className="h-4 w-full" />
                  {hasMore && logs.length > 0 && (
                    <div className="flex justify-center p-4">
                      <RefreshCw className="animate-spin text-muted-foreground" size={20} />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
