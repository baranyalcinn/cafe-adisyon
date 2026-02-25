import { cn } from '@/lib/utils'
import { Cake, Coffee, Cookie, IceCream, LucideIcon, Sandwich, Utensils, Wine } from 'lucide-react'
import React, { memo } from 'react'

// ============================================================================
// Icon Configuration (Centralized)
// ============================================================================

/** * İkon konfigürasyonlarını charts.txt dosyasındaki renk paletiyle
 * uyumlu hale getirerek görsel tutarlılık sağlıyoruz.
 */
const ICON_CONFIGS: Record<string, { component: LucideIcon; color: string; hex: string }> = {
  coffee: { component: Coffee, color: 'text-amber-600', hex: '#D97706' },
  'ice-cream-cone': { component: IceCream, color: 'text-cyan-400', hex: '#22D3EE' },
  cookie: { component: Cookie, color: 'text-yellow-500', hex: '#EAB308' },
  wine: { component: Wine, color: 'text-sky-400', hex: '#38BDF8' },
  cake: { component: Cake, color: 'text-pink-400', hex: '#F472B6' },
  sandwich: { component: Sandwich, color: 'text-orange-400', hex: '#FB923C' },
  utensils: { component: Utensils, color: 'text-emerald-500', hex: '#10B981' }
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

/**
 * Verilen ikon ismine göre HEX renk kodunu döndürür.
 * @param iconName İkonun anahtar ismi (örn: 'coffee')
 * @returns HEX renk kodu (örn: '#D97706')
 */
export function getCategoryColor(iconName?: string): string {
  const config = (iconName && ICON_CONFIGS[iconName]) || DEFAULT_ICON
  return config.hex
}

/** * Eğer bu ikonları büyük listeler içinde (örn: Kategori Listesi)
 * doğrudan bileşen olarak kullanmak isterseniz:
 */
export const CategoryIcon = memo(({ name, className }: { name?: string; className?: string }) => {
  return getCategoryIcon(name, className)
})

CategoryIcon.displayName = 'CategoryIcon'
