import { cn } from '@/lib/utils'
import { Cake, Coffee, Cookie, IceCream, LucideIcon, Sandwich, Utensils, Wine } from 'lucide-react'
import React, { memo } from 'react'

// ============================================================================
// Icon Configuration (Centralized)
// ============================================================================

/** * İkon konfigürasyonlarını charts.txt dosyasındaki renk paletiyle
 * uyumlu hale getirerek görsel tutarlılık sağlıyoruz.
 */
const ICON_CONFIGS: Record<string, { component: LucideIcon; color: string }> = {
  coffee: { component: Coffee, color: 'text-amber-600' },
  'ice-cream-cone': { component: IceCream, color: 'text-cyan-400' },
  cookie: { component: Cookie, color: 'text-yellow-500' },
  wine: { component: Wine, color: 'text-sky-400' },
  cake: { component: Cake, color: 'text-pink-400' },
  sandwich: { component: Sandwich, color: 'text-orange-400' },
  utensils: { component: Utensils, color: 'text-emerald-500' }
} as const

// Varsayılan ikon tanımı (Fallback)
const DEFAULT_ICON = ICON_CONFIGS['utensils']

// ============================================================================
// Main Utility Function
// ============================================================================

/**
 * Verilen isim ve sınıfa göre uygun Lucide ikonunu döndürür.
 * * @param iconName İkonun anahtar ismi (örn: 'coffee')
 * @param className Ekstra Tailwind sınıfları
 * @returns Hazır React JSX Elementi
 */
export function getCategoryIcon(iconName?: string, className?: string): React.JSX.Element {
  const baseClass = 'w-5 h-5 flex-shrink-0 transition-colors duration-200'

  // Konfigürasyonu bul veya varsayılana dön
  const config = (iconName && ICON_CONFIGS[iconName]) || DEFAULT_ICON
  const IconComponent = config.component

  return (
    <IconComponent data-slot="category-icon" className={cn(baseClass, config.color, className)} />
  )
}

/** * Eğer bu ikonları büyük listeler içinde (örn: Kategori Listesi)
 * doğrudan bileşen olarak kullanmak isterseniz:
 */
export const CategoryIcon = memo(({ name, className }: { name?: string; className?: string }) => {
  return getCategoryIcon(name, className)
})

CategoryIcon.displayName = 'CategoryIcon'
