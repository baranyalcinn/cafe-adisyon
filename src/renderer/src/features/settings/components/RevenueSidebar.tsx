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
      <div className="w-[340px] border-r bg-card/40 backdrop-blur-md h-full flex flex-col overflow-hidden">
        <div className="flex-1 p-4 space-y-5 overflow-y-auto custom-scrollbar">
          {/* --- FİNANSAL ÖZET (STAT CARDS) --- */}
          <div className="space-y-3">
            {/* Günlük Toplam */}
            <div className="p-4 rounded-2xl border border-border/40 bg-card shadow-sm group transition-all hover:border-rose-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-600">
                  <Banknote className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 text-[9px] font-black rounded-lg uppercase tracking-wider">
                  BUGÜN
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  GÜNLÜK TOPLAM
                </p>
                <p className="text-2xl font-black tabular-nums tracking-tighter text-foreground">
                  {formatCurrency(stats.todayTotal)}
                </p>
              </div>
            </div>

            {/* Aylık Toplam */}
            <div className="p-4 rounded-2xl border border-border/40 bg-card shadow-sm group transition-all hover:border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <PieChart className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 bg-primary/10 text-primary text-[9px] font-black rounded-lg uppercase tracking-wider">
                  BU AY
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  AYLIK TOPLAM
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
              <Filter className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/60 uppercase">
                FİLTRELEME
              </span>
            </div>

            <div className="space-y-3">
              {/* Arama */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black tracking-widest text-muted-foreground uppercase ml-1">
                  DETAYLI ARAMA
                </label>
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
                  <Input
                    placeholder="Gider adı, açıklama..."
                    value={filters.search}
                    onChange={(e) => onFilterChange('search', e.target.value)}
                    className="pl-10 h-10 bg-muted/20 border-none focus:ring-2 focus:ring-primary/20 text-xs font-bold rounded-xl transition-all"
                  />
                </div>
              </div>

              {/* Kategori Seçimi */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black tracking-widest text-muted-foreground uppercase ml-1">
                  KATEGORİ SEÇİMİ
                </label>
                <Select
                  value={filters.category}
                  onValueChange={(val) => onFilterChange('category', val)}
                >
                  <SelectTrigger className="w-full h-10 bg-muted/20 border-none rounded-xl text-xs font-bold transition-all hover:bg-muted/40 px-4 focus:ring-0">
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-primary/60" />
                      <SelectValue placeholder="Tüm Kategoriler" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem
                      value="all"
                      className="text-xs font-bold py-3 rounded-xl uppercase tracking-wider"
                    >
                      Tüm Kategoriler
                    </SelectItem>
                    {categories.map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat}
                        className="text-xs font-bold py-3 rounded-xl uppercase tracking-wider"
                      >
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tarih Aralığı */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black tracking-widest text-muted-foreground uppercase ml-1">
                  ZAMAN ARALIĞI
                </label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(val) => onFilterChange('dateRange', val)}
                >
                  <SelectTrigger className="w-full h-10 bg-muted/20 border-none rounded-xl text-xs font-bold transition-all hover:bg-muted/40 px-4 focus:ring-0">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-primary/60" />
                      <SelectValue placeholder="Tüm Zamanlar" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem
                      value="all"
                      className="text-xs font-bold py-3 rounded-xl uppercase tracking-wider text-muted-foreground"
                    >
                      Tüm Zamanlar
                    </SelectItem>
                    <SelectItem
                      value="today"
                      className="text-xs font-bold py-3 rounded-xl uppercase tracking-wider"
                    >
                      Bugün
                    </SelectItem>
                    <SelectItem
                      value="week"
                      className="text-xs font-bold py-3 rounded-xl uppercase tracking-wider"
                    >
                      Bu Hafta
                    </SelectItem>
                    <SelectItem
                      value="month"
                      className="text-xs font-bold py-3 rounded-xl uppercase tracking-wider"
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
