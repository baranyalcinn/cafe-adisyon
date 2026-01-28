import React from 'react'
import { Coffee, IceCream, Cookie, Utensils, Wine, Cake, Sandwich } from 'lucide-react'
import { cn } from '@/lib/utils'

export function getCategoryIcon(iconName?: string, className?: string): React.ReactNode {
  const baseClass = cn('w-5 h-5', className)
  switch (iconName) {
    case 'coffee':
      return <Coffee className={cn(baseClass, 'text-amber-600')} />
    case 'ice-cream-cone':
      return <IceCream className={cn(baseClass, 'text-cyan-400')} />
    case 'cookie':
      return <Cookie className={cn(baseClass, 'text-yellow-500')} />
    case 'wine':
      return <Wine className={cn(baseClass, 'text-sky-400')} />
    case 'cake':
      return <Cake className={cn(baseClass, 'text-pink-400')} />
    case 'sandwich':
      return <Sandwich className={cn(baseClass, 'text-orange-400')} />
    case 'utensils':
    default:
      return <Utensils className={cn(baseClass, 'text-emerald-500')} />
  }
}
