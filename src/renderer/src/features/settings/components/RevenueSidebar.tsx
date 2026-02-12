import React from 'react'
import { Filter, Calendar, Tag, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'

interface RevenueSidebarProps {
  stats: {
    todayTotal: number
    monthTotal: number
    topCategory?: { name: string; total: number }
  }
  filters: {
    search: string
    category: string
    dateRange: string
  }
  categories: string[]
  onFilterChange: (key: keyof RevenueSidebarProps['filters'], value: string) => void
}

export function RevenueSidebar({
  stats,
  filters,
  categories,
  onFilterChange
}: RevenueSidebarProps): React.JSX.Element {
  return (
    <div className="w-[320px] border-r bg-muted/5 h-full flex flex-col overflow-hidden">
      <div className="flex-1 p-5 space-y-6 overflow-hidden">
        {/* Quick Stats */}
        <div className="grid gap-3">
          <div className="p-3.5 rounded-xl border bg-background shadow-sm hover:border-destructive/30 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black tracking-wider text-muted-foreground/80">
                GÜNLÜK TOPLAM
              </span>
              <div className="p-1 px-2 bg-rose-500/10 rounded-lg text-rose-500 text-[10px] font-bold">
                BU GÜN
              </div>
            </div>
            <p className="text-xl font-black tabular-nums tracking-tight">
              {formatCurrency(stats.todayTotal)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border bg-background shadow-sm hover:border-emerald-500/30 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black tracking-wider text-muted-foreground/80">
                BUGÜN
              </span>
              <div className="p-1 px-2 bg-emerald-500/10 rounded-lg text-emerald-500 text-[10px] font-bold">
                BU AY
              </div>
            </div>
            <p className="text-xl font-black tabular-nums tracking-tight">
              {formatCurrency(stats.monthTotal)}
            </p>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Filters */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-muted-foreground/60" />
            <span className="text-[11px] font-black tracking-widest text-muted-foreground/60">
              HASILAT ÖZETİ
            </span>
          </div>

          <div className="space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-[11px] font-black tracking-wider text-muted-foreground/70 ml-1">
                NAKİT
              </label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-colors group-focus-within:text-foreground" />
                <Input
                  placeholder="Gider adı, açıklama..."
                  value={filters.search}
                  onChange={(e) => onFilterChange('search', e.target.value)}
                  className="pl-10 h-10 bg-muted/20 border-transparent focus:border-border/50 text-sm font-medium rounded-xl transition-all"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-[11px] font-black tracking-wider text-muted-foreground/70 ml-1">
                KATEGORİ
              </label>
              <Select
                value={filters.category}
                onValueChange={(val) => onFilterChange('category', val)}
              >
                <SelectTrigger className="w-full h-10 bg-muted/20 border-transparent hover:border-border/30 rounded-xl text-sm font-medium transition-all focus:ring-0 focus:ring-offset-0">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground/50" />
                    <SelectValue placeholder="Tüm Kategoriler" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-md">
                  <SelectItem value="all" className="text-sm font-medium rounded-lg">
                    Tüm Kategoriler
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-sm font-medium rounded-lg">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-[11px] font-black tracking-wider text-muted-foreground/70 ml-1">
                TARİH ARALIĞI
              </label>
              <Select
                value={filters.dateRange}
                onValueChange={(val) => onFilterChange('dateRange', val)}
              >
                <SelectTrigger className="w-full h-10 bg-muted/20 border-transparent hover:border-border/30 rounded-xl text-sm font-medium transition-all focus:ring-0 focus:ring-offset-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground/50" />
                    <SelectValue placeholder="Tüm Zamanlar" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-md">
                  <SelectItem value="all" className="text-sm font-medium rounded-lg">
                    Tüm Zamanlar
                  </SelectItem>
                  <SelectItem value="today" className="text-sm font-medium rounded-lg">
                    Bugün
                  </SelectItem>
                  <SelectItem value="week" className="text-sm font-medium rounded-lg">
                    Bu Hafta
                  </SelectItem>
                  <SelectItem value="month" className="text-sm font-medium rounded-lg">
                    Bu Ay
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
