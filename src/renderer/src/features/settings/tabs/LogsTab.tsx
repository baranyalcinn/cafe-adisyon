import { useEffect, useState } from 'react'
import {
  History,
  Monitor,
  ShoppingCart,
  RefreshCw,
  Search,
  ArrowUpDown,
  Calendar
} from 'lucide-react'
import { Card } from '@/components/ui/card'
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

// Category definitions
type LogCategory = 'all' | 'system' | 'operation'

const CATEGORY_TABS: { id: LogCategory; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Tümü', icon: History },
  { id: 'operation', label: 'Operasyon', icon: ShoppingCart },
  { id: 'system', label: 'Sistem', icon: Monitor }
]

const ACTION_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  // System
  GENERATE_ZREPORT: {
    label: 'Z-Raporu',
    color: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700'
  },
  ARCHIVE_DATA: {
    label: 'Arşivleme',
    color: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700'
  },
  BACKUP_DATABASE: {
    label: 'Yedekleme',
    color: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700'
  },
  END_OF_DAY: {
    label: 'Gün Sonu',
    color: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700'
  },

  // Table
  OPEN_TABLE: {
    label: 'Masa Açıldı',
    color: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700'
  },
  CLOSE_TABLE: {
    label: 'Masa Kapatıldı',
    color: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700'
  },
  MOVE_TABLE: { label: 'Taşıma', color: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },

  // Order
  ADD_ITEM: {
    label: 'Sipariş',
    color: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700'
  },
  CANCEL_ITEM: { label: 'İptal', color: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  PAYMENT_CASH: {
    label: 'Nakit Ödeme',
    color: 'text-emerald-600 font-bold',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  PAYMENT_CARD: {
    label: 'Kart Ödeme',
    color: 'text-blue-600 font-bold',
    badge: 'bg-blue-100 text-blue-800'
  }
}

export function LogsTab(): React.JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState<LogCategory>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const loadLogs = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const data = await cafeApi.logs.getRecent(500)
      setLogs(data)
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const toggleExpand = (logId: string): void => {
    setExpandedLogId(expandedLogId === logId ? null : logId)
  }

  const filteredLogs = logs.filter((log) => {
    // Category Filter
    if (
      category === 'system' &&
      ![
        'GENERATE_ZREPORT',
        'BACKUP_DATABASE',
        'ARCHIVE_DATA',
        'END_OF_DAY',
        'VACUUM',
        'SOFT_RESET'
      ].includes(log.action)
    )
      return false
    if (
      category === 'operation' &&
      [
        'GENERATE_ZREPORT',
        'BACKUP_DATABASE',
        'ARCHIVE_DATA',
        'END_OF_DAY',
        'VACUUM',
        'SOFT_RESET'
      ].includes(log.action)
    )
      return false

    // Search Filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const details = log.details || ''
      const tableName = log.tableName || ''
      return (
        details.toLowerCase().includes(searchLower) ||
        tableName.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
      {/* Header Section */}
      <div className="flex-none py-1 px-8 border-b bg-background/50 backdrop-blur z-10 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">İşlem Geçmişi</h2>
            <p className="text-sm text-muted-foreground">
              Sistemdeki tüm hareketleri ve operasyonları takip edin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoading}>
              <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
              Güncelle
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Segmented Control */}
          <div className="flex p-1 bg-muted rounded-lg w-full md:w-auto">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategory(tab.id)}
                className={cn(
                  'flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all',
                  category === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="İşlem, masa veya detay ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Height Table */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="w-[200px] pl-8">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Tarih & Saat
                  </div>
                </TableHead>
                <TableHead className="w-[180px]">İşlem</TableHead>
                <TableHead className="w-[150px]">Masa / Kaynak</TableHead>
                <TableHead>Detay</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Kayıt bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const config = ACTION_CONFIG[log.action]
                  const isExpanded = expandedLogId === log.id
                  return (
                    <>
                      <TableRow
                        key={log.id}
                        className={cn(
                          'group cursor-pointer hover:bg-muted/30 border-b transition-colors',
                          isExpanded && 'bg-muted/40'
                        )}
                        onClick={() => toggleExpand(log.id)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground pl-8">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {new Date(log.createdAt).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="text-[10px] opacity-70">
                              {new Date(log.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className={cn(
                              'font-semibold text-sm',
                              config?.color || 'text-foreground'
                            )}
                          >
                            {config?.label || log.action}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.tableName ? (
                            <div className="flex items-center gap-1.5 font-medium text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {log.tableName}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[400px]">
                          <p className="truncate text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                            {log.details}
                          </p>
                        </TableCell>
                        <TableCell>
                          {isExpanded ? (
                            <ArrowUpDown className="w-4 h-4 text-primary rotate-180 transition-transform" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4 text-muted-foreground opacity-50" />
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <TableRow className="bg-muted/5 hover:bg-muted/10 border-b-2">
                          <TableCell colSpan={5} className="p-0">
                            <div className="p-8 pl-12 flex flex-col gap-8 animate-in slide-in-from-top-4 duration-300">
                              {/* Quick Info Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <Monitor className="w-3 h-3" /> İşlem Türü
                                  </span>
                                  <div
                                    className={cn('font-bold text-lg leading-tight', config?.color)}
                                  >
                                    {config?.label}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3" /> İşlem Tarihi
                                  </span>
                                  <div className="font-semibold text-sm text-foreground/80">
                                    {new Date(log.createdAt).toLocaleDateString('tr-TR', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <History className="w-3 h-3" /> İşlem Saati
                                  </span>
                                  <div className="font-mono text-sm font-bold text-foreground/80">
                                    {new Date(log.createdAt).toLocaleTimeString('tr-TR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <ShoppingCart className="w-3 h-3" /> Kaynak
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {log.tableName ? (
                                      <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-xs font-black uppercase ring-1 ring-emerald-500/20">
                                        {log.tableName}
                                      </div>
                                    ) : (
                                      <span className="text-xs font-bold text-muted-foreground italic">
                                        Sistem Geneli
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Detailed Activity Card */}
                              <div className="space-y-3">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5">
                                  <History className="w-3 h-3" /> Aktivite Detayı
                                </span>
                                <div className="relative p-5 bg-background rounded-2xl border-2 shadow-sm group/card overflow-hidden">
                                  <div
                                    className={cn(
                                      'absolute top-0 left-0 w-1 h-full transition-all duration-300',
                                      config?.color?.replace('text-', 'bg-') || 'bg-primary'
                                    )}
                                  />
                                  <div className="flex gap-4">
                                    <div
                                      className={cn(
                                        'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                                        config?.color
                                          ?.replace('text-', 'bg-')
                                          ?.replace('-', '-500/10 ') || 'bg-muted'
                                      )}
                                    >
                                      <History className={cn('w-6 h-6', config?.color)} />
                                    </div>
                                    <div className="space-y-1 py-1">
                                      <p className="text-base font-medium text-foreground leading-relaxed">
                                        {log.details}
                                      </p>
                                      {log.action.includes('PAYMENT') && (
                                        <p className="text-xs font-bold text-emerald-600/80 uppercase tracking-wide">
                                          Finansal İşlem Onaylandı
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  )
}
