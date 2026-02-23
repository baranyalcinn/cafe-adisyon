import { AdminPinModal } from '@/components/ui/AdminPinModal'
import { Button } from '@/components/ui/button'
import { type ColorScheme } from '@/hooks/useTheme'
import { cafeApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ChevronRight,
  Coffee,
  History,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  LogOut,
  Receipt,
  RefreshCw,
  Settings as SettingsIcon,
  Tags,
  Wrench
} from 'lucide-react'
import React, { Suspense, lazy, useEffect, useState } from 'react'

// Lazy load heavy components
const GeneralSettingsTab = lazy(() =>
  import('./tabs/GeneralSettingsTab').then((m) => ({ default: m.GeneralSettingsTab }))
)
const DashboardView = lazy(() =>
  import('@/features/dashboard/DashboardView').then((m) => ({ default: m.DashboardView }))
)
const TablesTab = lazy(() => import('./tabs/TablesTab').then((m) => ({ default: m.TablesTab })))
const CategoriesTab = lazy(() =>
  import('./tabs/CategoriesTab').then((m) => ({ default: m.CategoriesTab }))
)
const ProductsTab = lazy(() =>
  import('./tabs/ProductsTab').then((m) => ({ default: m.ProductsTab }))
)
const LogsTab = lazy(() => import('./tabs/LogsTab').then((m) => ({ default: m.LogsTab })))
const MaintenanceTab = lazy(() =>
  import('./tabs/MaintenanceTab').then((m) => ({ default: m.MaintenanceTab }))
)
const ExpensesTab = lazy(() =>
  import('./tabs/ExpensesTab').then((m) => ({ default: m.ExpensesTab }))
)

interface SettingsViewProps {
  isDark: boolean
  onThemeToggle: () => void
  colorScheme: ColorScheme
  onColorSchemeChange: (scheme: ColorScheme) => void
}

const MENU_ITEMS = [
  {
    id: 'general',
    label: 'Genel Ayarlar',
    description: 'Tema, ses, renkler ve görünüm tercihleri',
    icon: SettingsIcon,
    color: 'text-slate-500'
  },
  {
    id: 'tables',
    label: 'Masa Yönetimi',
    description: 'Masa ekleme, silme ve düzenleme işlemleri',
    icon: LayoutGrid,
    color: 'text-violet-500'
  },
  {
    id: 'categories',
    label: 'Kategoriler',
    description: 'Ürün kategorilerini yönetin',
    icon: Tags,
    color: 'text-amber-500'
  },
  {
    id: 'products',
    label: 'Ürünler & Menü',
    description: 'Fiyatlar, ürünler',
    icon: Coffee,
    color: 'text-emerald-500'
  },
  {
    id: 'expenses',
    label: 'Giderler',
    description: 'İşletme giderlerini kaydedin',
    icon: Receipt,
    color: 'text-rose-500'
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Detaylı analiz ve raporlar',
    icon: LayoutDashboard,
    color: 'text-blue-500'
  },
  {
    id: 'logs',
    label: 'İşlem Geçmişi',
    description: 'Tüm sistem loglarını görüntüleyin',
    icon: History,
    color: 'text-orange-500'
  },
  {
    id: 'maintenance',
    label: 'Bakım',
    description: 'Sistem bakımı ve veritabanı işlemleri',
    icon: Wrench,
    color: 'text-gray-500'
  }
]

export function SettingsView({
  isDark,
  onThemeToggle,
  colorScheme,
  onColorSchemeChange
}: SettingsViewProps): React.JSX.Element {
  const [activeView, setActiveView] = useState<string | null>(null)

  // PIN verification state
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check PIN status on mount
  useEffect(() => {
    const checkPinStatus = async (): Promise<void> => {
      try {
        const { required } = await cafeApi.admin.checkStatus()
        if (!required) setIsUnlocked(true)
      } catch (error) {
        console.error('Failed to check PIN status:', error)
      } finally {
        setIsLoading(false)
      }
    }
    checkPinStatus()
  }, [])

  const handlePinSuccess = (): void => {
    setIsUnlocked(true)
    setShowPinModal(false)
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // Lock Screen
  if (!isUnlocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Ayarlar Kilitli</h1>
          <p className="text-muted-foreground">Devam etmek için yönetici PIN kodunu girin</p>
        </div>

        <AdminPinModal
          open={showPinModal}
          onOpenChange={(open) => {
            if (!open && !isUnlocked) setShowPinModal(false)
            else setShowPinModal(open)
          }}
          onSuccess={handlePinSuccess}
          title="Yönetici Girişi"
          description="Lütfen 4 haneli PIN kodunu girin"
        />

        <Button onClick={() => setShowPinModal(true)} size="lg" className="mt-2 min-w-[200px]">
          <Lock className="w-4 h-4 mr-2" />
          Kilit Aç
        </Button>
      </div>
    )
  }

  // --- Main Menu View ---
  if (!activeView) {
    return (
      <div className="h-full flex flex-col bg-background overflow-auto p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-extrabold tracking-tight">Ayarlar</h1>
            <Button
              variant="outline"
              className="h-10 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setIsUnlocked(false)}
            >
              <LogOut className="mr-2.5 w-5 h-5" />
              Çıkış Yap
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grid-auto-rows-[1fr]">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className="group relative flex flex-col h-full min-h-[200px] items-start rounded-2xl border bg-card p-6 text-left shadow-sm transition-all hover:bg-muted/50 hover:shadow-md hover:-translate-y-1"
              >
                <div
                  className={cn(
                    'mb-5 rounded-xl bg-muted/50 p-4 transition-all duration-300 group-hover:bg-background shadow-sm',
                    item.color
                  )}
                >
                  <item.icon className="h-8 w-8" />
                </div>
                <div className="flex-1 flex flex-col mt-2">
                  <h3 className="mb-1.5 text-xl font-bold tracking-tight text-foreground/90">
                    {item.label}
                  </h3>
                  <p className="line-clamp-3 text-[13px] font-medium leading-relaxed text-muted-foreground/70">
                    {item.description}
                  </p>
                </div>
                <div className="mt-4 flex w-full justify-end opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // --- Detail View Wrapper ---
  const activeItem = MENU_ITEMS.find((i) => i.id === activeView)
  const isFullWidthView = [
    'products',
    'dashboard',
    'tables',
    'categories',
    'logs',
    'expenses',
    'maintenance'
  ].includes(activeView || '')

  return (
    <div className="h-full flex flex-col bg-background animate-in slide-in-from-right-8 duration-300">
      {/* Detail Header */}
      <div className="flex-none flex items-center gap-4 px-6 py-4 border-b bg-background/95 backdrop-blur z-10 sticky top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setActiveView(null)}
          className="rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="h-8 w-px bg-border/60 mx-1" />
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg bg-muted/60', activeItem?.color)}>
            {activeItem?.icon && <activeItem.icon className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="font-bold text-lg tracking-tight leading-none">{activeItem?.label}</h2>
            <p className="text-xs text-muted-foreground mt-1">{activeItem?.description}</p>
          </div>
        </div>
        <div className="flex-1" />
        <div id="settings-header-actions" className="flex items-center gap-2" />
      </div>

      {/* Detail Content */}
      <div
        className={cn(
          'flex-1 bg-background min-h-0',
          !isFullWidthView ? 'overflow-auto p-6' : 'overflow-hidden'
        )}
      >
        <div className={cn('h-full', !isFullWidthView ? 'max-w-6xl mx-auto space-y-6' : 'w-full')}>
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            }
          >
            {activeView === 'general' && (
              <GeneralSettingsTab
                isDark={isDark}
                onThemeToggle={onThemeToggle}
                colorScheme={colorScheme}
                onColorSchemeChange={onColorSchemeChange}
                activeView={activeView}
              />
            )}
            {activeView === 'tables' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500 h-full">
                <TablesTab />
              </div>
            )}
            {activeView === 'categories' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500 h-full">
                <CategoriesTab />
              </div>
            )}
            {activeView === 'products' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500 h-full">
                <ProductsTab />
              </div>
            )}
            {activeView === 'expenses' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500 h-full">
                <ExpensesTab />
              </div>
            )}
            {activeView === 'dashboard' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500 h-full">
                <DashboardView />
              </div>
            )}
            {activeView === 'logs' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500 h-full">
                <LogsTab />
              </div>
            )}
            {activeView === 'maintenance' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500 h-full">
                <MaintenanceTab />
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  )
}
