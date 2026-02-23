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
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'

type SettingsTabId =
  | 'general'
  | 'tables'
  | 'categories'
  | 'products'
  | 'expenses'
  | 'dashboard'
  | 'logs'
  | 'maintenance'

interface SettingsViewProps {
  isDark: boolean
  onThemeToggle: () => void
  colorScheme: ColorScheme
  onColorSchemeChange: (scheme: ColorScheme) => void
}

const ACTIVE_VIEW_STORAGE_KEY = 'caffio.settings.activeView'

/* ----------------------------- Lazy loaders ----------------------------- */
const loadGeneralSettingsTab = (): Promise<typeof import('./tabs/GeneralSettingsTab')> =>
  import('./tabs/GeneralSettingsTab')
const loadDashboardView = (): Promise<typeof import('@/features/dashboard/DashboardView')> =>
  import('@/features/dashboard/DashboardView')
const loadTablesTab = (): Promise<typeof import('./tabs/TablesTab')> => import('./tabs/TablesTab')
const loadCategoriesTab = (): Promise<typeof import('./tabs/CategoriesTab')> =>
  import('./tabs/CategoriesTab')
const loadProductsTab = (): Promise<typeof import('./tabs/ProductsTab')> =>
  import('./tabs/ProductsTab')
const loadLogsTab = (): Promise<typeof import('./tabs/LogsTab')> => import('./tabs/LogsTab')
const loadMaintenanceTab = (): Promise<typeof import('./tabs/MaintenanceTab')> =>
  import('./tabs/MaintenanceTab')
const loadExpensesTab = (): Promise<typeof import('./tabs/ExpensesTab')> =>
  import('./tabs/ExpensesTab')

const GeneralSettingsTab = lazy(() =>
  loadGeneralSettingsTab().then((m) => ({ default: m.GeneralSettingsTab }))
)
const DashboardView = lazy(() => loadDashboardView().then((m) => ({ default: m.DashboardView })))
const TablesTab = lazy(() => loadTablesTab().then((m) => ({ default: m.TablesTab })))
const CategoriesTab = lazy(() => loadCategoriesTab().then((m) => ({ default: m.CategoriesTab })))
const ProductsTab = lazy(() => loadProductsTab().then((m) => ({ default: m.ProductsTab })))
const LogsTab = lazy(() => loadLogsTab().then((m) => ({ default: m.LogsTab })))
const MaintenanceTab = lazy(() => loadMaintenanceTab().then((m) => ({ default: m.MaintenanceTab })))
const ExpensesTab = lazy(() => loadExpensesTab().then((m) => ({ default: m.ExpensesTab })))

const prefetchTab = (tabId: SettingsTabId): void => {
  switch (tabId) {
    case 'general':
      void loadGeneralSettingsTab()
      break
    case 'tables':
      void loadTablesTab()
      break
    case 'categories':
      void loadCategoriesTab()
      break
    case 'products':
      void loadProductsTab()
      break
    case 'expenses':
      void loadExpensesTab()
      break
    case 'dashboard':
      void loadDashboardView()
      break
    case 'logs':
      void loadLogsTab()
      break
    case 'maintenance':
      void loadMaintenanceTab()
      break
  }
}

type MenuItem = {
  id: SettingsTabId
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  chipBg: string
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'general',
    label: 'Genel Ayarlar',
    description: 'Tema, ses, renkler ve görünüm tercihleri',
    icon: SettingsIcon,
    color: 'text-slate-500',
    chipBg: 'bg-slate-500/10'
  },
  {
    id: 'tables',
    label: 'Masa Yönetimi',
    description: 'Masa ekleme, silme ve düzenleme işlemleri',
    icon: LayoutGrid,
    color: 'text-violet-500',
    chipBg: 'bg-violet-500/10'
  },
  {
    id: 'categories',
    label: 'Kategoriler',
    description: 'Ürün kategorilerini yönetin',
    icon: Tags,
    color: 'text-amber-500',
    chipBg: 'bg-amber-500/10'
  },
  {
    id: 'products',
    label: 'Ürünler ve Menü',
    description: 'Ürün kartları, fiyatlar ve menü düzeni',
    icon: Coffee,
    color: 'text-emerald-500',
    chipBg: 'bg-emerald-500/10'
  },
  {
    id: 'expenses',
    label: 'Giderler',
    description: 'İşletme giderlerini kaydedin ve yönetin',
    icon: Receipt,
    color: 'text-rose-500',
    chipBg: 'bg-rose-500/10'
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Detaylı analiz ve rapor ekranı',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    chipBg: 'bg-blue-500/10'
  },
  {
    id: 'logs',
    label: 'İşlem Geçmişi',
    description: 'Sistem loglarını ve işlem kayıtlarını görüntüleyin',
    icon: History,
    color: 'text-orange-500',
    chipBg: 'bg-orange-500/10'
  },
  {
    id: 'maintenance',
    label: 'Bakım',
    description: 'Sistem bakımı ve veritabanı işlemleri',
    icon: Wrench,
    color: 'text-zinc-500',
    chipBg: 'bg-zinc-500/10'
  }
]

const BOXED_VIEWS = new Set<SettingsTabId>(['logs', 'maintenance'])

function SettingsContentSkeleton(): React.JSX.Element {
  return (
    <div className="h-full w-full p-4 md:p-6">
      <div className="mx-auto w-full max-w-6xl space-y-4 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/70" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-36 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/70" />
          <div className="h-36 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/70" />
          <div className="h-28 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/70 md:col-span-2" />
        </div>
      </div>
    </div>
  )
}

export function SettingsView({
  isDark,
  onThemeToggle,
  colorScheme,
  onColorSchemeChange
}: SettingsViewProps): React.JSX.Element {
  const [activeView, setActiveView] = useState<SettingsTabId | null>(null)

  // PIN verification state
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const activeItem = useMemo(
    () => MENU_ITEMS.find((i) => i.id === activeView) ?? null,
    [activeView]
  )

  const isBoxedView = useMemo(
    () => (activeView ? BOXED_VIEWS.has(activeView) : false),
    [activeView]
  )

  // Check PIN status + restore last active tab
  useEffect(() => {
    const restoreAndCheck = async (): Promise<void> => {
      try {
        const saved = localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY) as SettingsTabId | null
        if (saved && MENU_ITEMS.some((i) => i.id === saved)) {
          setActiveView(saved)
        }

        const { required } = await cafeApi.admin.checkStatus()
        if (!required) {
          setIsUnlocked(true)
        } else {
          setShowPinModal(true)
        }
      } catch (error) {
        console.error('Failed to initialize settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void restoreAndCheck()
  }, [])

  // Persist last active view
  useEffect(() => {
    if (activeView) {
      localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView)
    }
  }, [activeView])

  const handlePinSuccess = useCallback((): void => {
    setIsUnlocked(true)
    setShowPinModal(false)
  }, [])

  const handleLogout = useCallback((): void => {
    setIsUnlocked(false)
    setShowPinModal(true)
  }, [])

  const handleBack = useCallback((): void => {
    setActiveView(null)
  }, [])

  const handleOpenTab = useCallback((id: SettingsTabId): void => {
    setActiveView(id)
  }, [])

  // ESC key to go back (dialog açıkken geri gitmesin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || !activeView) return

      const hasOpenDialog = Boolean(
        document.querySelector('[role="dialog"][data-state="open"], [data-radix-dialog-content]')
      )

      if (hasOpenDialog) return
      setActiveView(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeView])

  const renderActiveTab = (): React.JSX.Element | null => {
    switch (activeView) {
      case 'general':
        return (
          <GeneralSettingsTab
            isDark={isDark}
            onThemeToggle={onThemeToggle}
            colorScheme={colorScheme}
            onColorSchemeChange={onColorSchemeChange}
            activeView={activeView}
          />
        )

      case 'tables':
        return (
          <div className="animate-in slide-in-from-bottom-2 duration-300 h-full">
            <TablesTab />
          </div>
        )

      case 'categories':
        return (
          <div className="animate-in slide-in-from-bottom-2 duration-300 h-full">
            <CategoriesTab />
          </div>
        )

      case 'products':
        return (
          <div className="animate-in slide-in-from-bottom-2 duration-300 h-full">
            <ProductsTab />
          </div>
        )

      case 'expenses':
        return (
          <div className="animate-in slide-in-from-bottom-2 duration-300 h-full">
            <ExpensesTab />
          </div>
        )

      case 'dashboard':
        return (
          <div className="animate-in slide-in-from-bottom-2 duration-300 h-full">
            <DashboardView />
          </div>
        )

      case 'logs':
        return (
          <div className="animate-in slide-in-from-bottom-2 duration-300 h-full">
            <LogsTab />
          </div>
        )

      case 'maintenance':
        return (
          <div className="animate-in slide-in-from-bottom-2 duration-300 h-full">
            <MaintenanceTab />
          </div>
        )

      default:
        return null
    }
  }

  // Loading
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          Ayarlar hazırlanıyor...
        </div>
      </div>
    )
  }

  // Lock screen
  if (!isUnlocked) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div
          className={cn(
            'w-full max-w-md rounded-3xl border',
            'border-zinc-200/70 dark:border-zinc-800/80',
            'bg-white/90 dark:bg-zinc-900/85 backdrop-blur-xl',
            'shadow-[0_10px_30px_rgba(0,0,0,0.04)]'
          )}
        >
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-700/70 bg-zinc-100/70 dark:bg-zinc-800/50 flex items-center justify-center">
              <Lock className="w-7 h-7 text-primary" />
            </div>

            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Ayarlar Kilitli
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Devam etmek için yönetici PIN kodunu girin
            </p>

            <Button
              onClick={() => setShowPinModal(true)}
              className="mt-5 h-10 px-4 rounded-xl text-sm font-medium min-w-[180px]"
            >
              <Lock className="w-4 h-4 mr-2" />
              Kilidi Aç
            </Button>
          </div>
        </div>

        <AdminPinModal
          open={showPinModal}
          onOpenChange={setShowPinModal}
          onSuccess={handlePinSuccess}
          title="Yönetici Girişi"
          description="Lütfen 4 haneli PIN kodunu girin"
        />
      </div>
    )
  }

  // Main menu
  if (!activeView) {
    return (
      <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
          <div className="mb-5 md:mb-6 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Ayarlar
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sistem ve uygulama ayarlarını yönetin
              </p>
            </div>

            <Button
              variant="outline"
              className={cn(
                'h-10 rounded-xl px-3.5 text-sm font-medium',
                'border-zinc-200/70 dark:border-zinc-700/70',
                'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60'
              )}
              onClick={handleLogout}
            >
              <LogOut className="mr-2 w-4 h-4" />
              Çıkış Yap
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 auto-rows-fr">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={`${item.label} sekmesini aç`}
                onClick={() => handleOpenTab(item.id)}
                onMouseEnter={() => prefetchTab(item.id)}
                onFocus={() => prefetchTab(item.id)}
                className={cn(
                  'group relative flex h-full min-h-[208px] flex-col items-start text-left',
                  'rounded-2xl border p-6',
                  'border-zinc-200/70 dark:border-zinc-800/80',
                  'bg-white/85 dark:bg-zinc-900/80 backdrop-blur-xl',
                  'shadow-sm transition-all duration-200',
                  'hover:shadow-md hover:-translate-y-[1px] hover:border-primary/25',
                  'active:scale-[0.99]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25'
                )}
              >
                <div
                  className={cn(
                    'mb-4 rounded-xl p-3.5 border border-transparent transition-all',
                    'bg-zinc-100/70 dark:bg-zinc-800/50 group-hover:bg-white dark:group-hover:bg-zinc-900',
                    'group-hover:border-zinc-200/70 dark:group-hover:border-zinc-700/70',
                    item.color,
                    item.chipBg
                  )}
                >
                  <item.icon className="h-6 w-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-[17px] font-semibold tracking-tight text-foreground leading-tight">
                    {item.label}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground line-clamp-3">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 w-full flex justify-end opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                  <div className="h-8 w-8 rounded-full border border-zinc-200/70 dark:border-zinc-700/70 bg-zinc-100/70 dark:bg-zinc-800/50 flex items-center justify-center">
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Detail view
  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 animate-in fade-in slide-in-from-right-2 duration-300">
      {/* Header */}
      <header
        className={cn(
          'sticky top-0 z-10 h-14 md:h-16 flex items-center px-4 md:px-6',
          'border-b border-zinc-200/70 dark:border-zinc-800/80',
          'bg-white/85 dark:bg-zinc-900/80 backdrop-blur-xl'
        )}
      >
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className={cn(
              'group h-9 rounded-xl px-2.5 md:px-3',
              'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60',
              'focus-visible:ring-2 focus-visible:ring-primary/25'
            )}
          >
            <ArrowLeft className="w-4 h-4 text-zinc-500 group-hover:text-foreground transition-transform group-hover:-translate-x-0.5" />
            <span className="ml-1.5 hidden sm:inline text-xs font-medium text-zinc-500 group-hover:text-foreground">
              Geri
            </span>
          </Button>

          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800" />

          <div className="flex items-center gap-2.5 min-w-0">
            {activeItem?.icon && (
              <activeItem.icon className={cn('w-[18px] h-[18px]', activeItem.color)} />
            )}
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground truncate">
                {activeItem?.label}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex-1" />
        <div id="settings-header-actions" className="flex items-center gap-2" />
      </header>

      {/* Content */}
      <div
        className={cn(
          'flex-1 min-h-0 bg-background',
          isBoxedView ? 'overflow-auto p-4 md:p-6' : 'overflow-hidden'
        )}
      >
        <div className={cn('h-full', isBoxedView ? 'max-w-6xl mx-auto' : 'w-full')}>
          <Suspense fallback={<SettingsContentSkeleton />}>{renderActiveTab()}</Suspense>
        </div>
      </div>
    </div>
  )
}
