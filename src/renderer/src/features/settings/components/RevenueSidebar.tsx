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
import { Banknote, Calendar, Filter, PieChart, Search, Tag } from 'lucide-react'
import React, { memo } from 'react'

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

export const RevenueSidebar = memo(
  ({ stats, filters, categories, onFilterChange }: RevenueSidebarProps): React.JSX.Element => {
    return (
      <div className="w-[320px] border-r-2 bg-zinc-50 dark:bg-zinc-950 h-full flex flex-col overflow-hidden">
        <div className="flex-1 p-3.5 space-y-4 overflow-y-auto custom-scrollbar">
          {/* --- FİNANSAL ÖZET (STAT CARDS) --- */}
          <div className="space-y-3">
            {/* Günlük Toplam */}
            <div className="p-4 rounded-2xl border-2 bg-white dark:bg-zinc-900 shadow-sm group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-rose-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-2 border-transparent group-hover:border-rose-500/10 rounded-xl text-rose-600 shadow-sm transition-all group-hover:scale-110">
                  <Banknote className="w-6 h-6" />
                </div>
                <span className="px-3 py-1.5 bg-rose-500/10 text-rose-600 text-[9px] font-black rounded-lg tracking-[0.2em] uppercase">
                  Bugün
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground tracking-widest">
                  Günlük Toplam
                </p>
                <p className="text-2xl font-black tabular-nums tracking-tighter text-foreground">
                  {formatCurrency(stats.todayTotal)}
                </p>
              </div>
            </div>

            {/* Aylık Toplam */}
            <div className="p-4 rounded-2xl border-2 bg-white dark:bg-zinc-900 shadow-sm group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-2 border-transparent group-hover:border-primary/10 rounded-xl text-primary shadow-sm transition-all group-hover:scale-110">
                  <PieChart className="w-6 h-6" />
                </div>
                <span className="px-3 py-1.5 bg-primary/10 text-primary text-[9px] font-black rounded-lg tracking-[0.2em] uppercase">
                  Bu Ay
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground tracking-widest">
                  Aylık Toplam
                </p>
                <p className="text-2xl font-black tabular-nums tracking-tighter text-foreground">
                  {formatCurrency(stats.monthTotal)}
                </p>
              </div>
            </div>
          </div>

          <Separator className="opacity-40" />

          {/* --- FİLTRELER --- */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 ml-1">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[12px] font-black tracking-widest text-zinc-400">
                Filtreleme
              </span>
            </div>

            <div className="space-y-3">
              {/* Arama */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black tracking-widest text-muted-foreground  ml-1">
                  Detaylı Arama
                </label>
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-colors group-focus-within:text-primary" />
                  <Input
                    placeholder="Gider adı, açıklama..."
                    value={filters.search}
                    onChange={(e) => onFilterChange('search', e.target.value)}
                    className="pl-10 h-9 bg-white dark:bg-zinc-900 border-2 focus:ring-0 text-xs font-bold rounded-xl transition-all"
                  />
                </div>
              </div>

              {/* Kategori Seçimi */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black tracking-widest text-muted-foreground  ml-1">
                  Kategori Seçimi
                </label>
                <Select
                  value={filters.category}
                  onValueChange={(val) => onFilterChange('category', val)}
                >
                  <SelectTrigger className="w-full h-9 bg-white dark:bg-zinc-900 border-2 rounded-xl text-xs font-bold transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 focus:ring-0">
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-primary/60" />
                      <SelectValue placeholder="Tüm Kategoriler" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem
                      value="all"
                      className="text-xs font-bold py-3 rounded-xl  tracking-wider"
                    >
                      Tüm Kategoriler
                    </SelectItem>
                    {categories.map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat}
                        className="text-xs font-bold py-3 rounded-xl tracking-tight"
                      >
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tarih Aralığı */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black tracking-widest text-muted-foreground  ml-1">
                  Zaman Aralığı
                </label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(val) => onFilterChange('dateRange', val)}
                >
                  <SelectTrigger className="w-full h-9 bg-white dark:bg-zinc-900 border-2 rounded-xl text-xs font-bold transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 focus:ring-0">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-primary/60" />
                      <SelectValue placeholder="Tüm Zamanlar" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem
                      value="all"
                      className="text-xs font-bold py-3 rounded-xl  tracking-wider text-muted-foreground"
                    >
                      Tüm Zamanlar
                    </SelectItem>
                    <SelectItem
                      value="today"
                      className="text-xs font-bold py-3 rounded-xl  tracking-wider"
                    >
                      Bugün
                    </SelectItem>
                    <SelectItem
                      value="week"
                      className="text-xs font-bold py-3 rounded-xl  tracking-wider"
                    >
                      Bu Hafta
                    </SelectItem>
                    <SelectItem
                      value="month"
                      className="text-xs font-bold py-3 rounded-xl  tracking-wider"
                    >
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
)
