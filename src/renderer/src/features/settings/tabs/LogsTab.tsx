import { useEffect, useState } from 'react'
import {
  History,
  Filter,
  Monitor,
  ShoppingCart,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cafeApi, type ActivityLog } from '@/lib/api'

// Category definitions
type LogCategory = 'all' | 'system' | 'operation'

const CATEGORY_CONFIG: Record<LogCategory, { label: string; icon: React.ReactNode }> = {
  all: { label: 'Tümü', icon: <History className="w-4 h-4" /> },
  system: { label: 'Sistem', icon: <Monitor className="w-4 h-4" /> },
  operation: { label: 'İşlemler', icon: <ShoppingCart className="w-4 h-4" /> }
}

// Action labels with category assignment and colors
const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; category: 'system' | 'operation' }
> = {
  // System actions
  GENERATE_ZREPORT: { label: 'Z-Raporu', color: 'text-purple-500', category: 'system' },
  ARCHIVE_DATA: { label: 'Veri Arşivleme', color: 'text-amber-500', category: 'system' },
  BACKUP_DATABASE: { label: 'Yedekleme', color: 'text-blue-500', category: 'system' },
  VACUUM: { label: 'DB Optimize', color: 'text-cyan-500', category: 'system' },
  END_OF_DAY: { label: 'Gün Sonu', color: 'text-indigo-500', category: 'system' },
  SOFT_RESET: { label: 'Veri Sıfırlama', color: 'text-red-500', category: 'system' },

  // Operation actions - Table
  OPEN_TABLE: { label: 'Masa Açıldı', color: 'text-emerald-500', category: 'operation' },
  CLOSE_TABLE: { label: 'Masa Kapatıldı', color: 'text-blue-500', category: 'operation' },
  MOVE_TABLE: { label: 'Masa Taşındı', color: 'text-orange-500', category: 'operation' },
  MERGE_TABLE: { label: 'Masalar Birleştirildi', color: 'text-purple-500', category: 'operation' },

  // Operation actions - Order Items
  ADD_ITEM: { label: 'Ürün Eklendi', color: 'text-emerald-500', category: 'operation' },
  REMOVE_ITEM: { label: 'Ürün Çıkarıldı', color: 'text-red-500', category: 'operation' },
  UPDATE_QUANTITY: { label: 'Miktar Güncellendi', color: 'text-orange-500', category: 'operation' },
  CANCEL_ITEM: { label: 'Ürün İptal', color: 'text-red-500', category: 'operation' },
  CLOSE_ORDER: { label: 'Sipariş Kapatıldı', color: 'text-blue-600', category: 'operation' },

  // Operation actions - Payment (farklı renkler)
  PAYMENT_CASH: { label: 'Nakit Ödeme', color: 'text-emerald-600', category: 'operation' },
  PAYMENT_CARD: { label: 'Kart Ödeme', color: 'text-blue-500', category: 'operation' },
  SPLIT_PAYMENT: { label: 'Bölünmüş Ödeme', color: 'text-purple-500', category: 'operation' },

  // Operation actions - Product Management
  ADD_PRODUCT: { label: 'Ürün Eklendi', color: 'text-emerald-500', category: 'operation' },
  DELETE_PRODUCT: { label: 'Ürün Silindi', color: 'text-red-500', category: 'operation' },
  CHANGE_PRICE: { label: 'Fiyat Değişikliği', color: 'text-orange-500', category: 'operation' }
}

export function LogsTab(): React.JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState<LogCategory>('all')
  const [actionFilter, setActionFilter] = useState<string | null>(null)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const loadLogs = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const data = await cafeApi.logs.getRecent(200)
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

  // Filter by category first, then by action
  const filteredLogs = logs.filter((log) => {
    const config = ACTION_CONFIG[log.action]
    const logCategory = config?.category || 'system'

    // Category filter
    if (category !== 'all' && logCategory !== category) {
      return false
    }

    // Action filter
    if (actionFilter && log.action !== actionFilter) {
      return false
    }

    return true
  })

  // Get unique actions for current category
  const uniqueActions = [...new Set(logs.map((log) => log.action))].filter(
    (action) => category === 'all' || ACTION_CONFIG[action]?.category === category
  )

  const toggleExpand = (logId: string): void => {
    setExpandedLogId(expandedLogId === logId ? null : logId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              İşlem Geçmişi
            </CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mt-4 border-b pb-3">
          {(Object.keys(CATEGORY_CONFIG) as LogCategory[]).map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setCategory(cat)
                setActionFilter(null)
              }}
              className="gap-2"
            >
              {CATEGORY_CONFIG[cat].icon}
              {CATEGORY_CONFIG[cat].label}
            </Button>
          ))}
        </div>

        {/* Action Filter */}
        <div className="flex gap-2 items-center mt-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={actionFilter || ''}
            onChange={(e) => setActionFilter(e.target.value || null)}
            className="text-sm border rounded-md px-3 py-1.5 bg-background min-w-[180px]"
          >
            <option value="">Tüm İşlemler</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {ACTION_CONFIG[action]?.label || action}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground ml-auto">
            {filteredLogs.length} kayıt gösteriliyor
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {filteredLogs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {category === 'all'
              ? 'Henüz işlem kaydı yok'
              : category === 'system'
                ? 'Sistem logu bulunamadı'
                : 'İşlem kaydı bulunamadı'}
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left py-2 px-3 w-[140px]">Tarih/Saat</th>
                  <th className="text-left py-2 px-3 w-[170px]">İşlem</th>
                  <th className="text-left py-2 px-3 w-[100px]">Masa</th>
                  <th className="text-left py-2 px-3">Detay</th>
                  <th className="text-left py-2 px-3 w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const actionInfo = ACTION_CONFIG[log.action] || {
                    label: log.action,
                    color: 'text-foreground',
                    category: 'system'
                  }
                  const isExpanded = expandedLogId === log.id
                  return (
                    <>
                      <tr
                        key={log.id}
                        className={`border-b cursor-pointer hover:bg-muted/50 ${isExpanded ? 'bg-muted/30' : ''}`}
                        onClick={() => toggleExpand(log.id)}
                      >
                        <td className="py-2 px-3 text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className={`py-2 px-3 font-medium ${actionInfo.color}`}>
                          {actionInfo.label}
                        </td>
                        <td className="py-2 px-3">{log.tableName || '-'}</td>
                        <td className="py-2 px-3 text-muted-foreground max-w-[300px] truncate">
                          {log.details || '-'}
                        </td>
                        <td className="py-2 px-3">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/20">
                          <td colSpan={5} className="p-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs">İşlem Türü</p>
                                <p className={`font-medium ${actionInfo.color}`}>
                                  {actionInfo.label}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Masa</p>
                                <p className="font-medium">{log.tableName || '-'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Tarih/Saat</p>
                                <p className="font-medium">
                                  {new Date(log.createdAt).toLocaleString('tr-TR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </p>
                              </div>
                              <div className="col-span-3">
                                <p className="text-muted-foreground text-xs">Detay</p>
                                <p className="font-medium">{log.details || '-'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
