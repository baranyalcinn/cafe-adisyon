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

// ============================================================================
// Types
// ============================================================================

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

type MenuItem = {
  id: SettingsTabId
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  chipBg: string
}

// ============================================================================
// Lazy Loading (Code Splitting)
// ============================================================================

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

// ============================================================================
// Constants & Styles
// ============================================================================

const BOXED_VIEWS = new Set<SettingsTabId>(['maintenance'])

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

// Tab bileşenlerini haritalandırıyoruz (Switch-case bloğunu kaldırmak için)
const TAB_COMPONENTS: Record<Exclude<SettingsTabId, 'general'>, React.ElementType> = {
  tables: TablesTab,
  categories: CategoriesTab,
  products: ProductsTab,
  expenses: ExpensesTab,
  dashboard: DashboardView,
  logs: LogsTab,
  maintenance: MaintenanceTab
}

const STYLES = {
  baseBg: 'bg-zinc-50 dark:bg-zinc-950',
  fullCenter: 'h-full flex items-center justify-center',
  lockCard:
    'w-full max-w-md rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/85 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.04)]',
  lockIconWrap:
    'w-16 h-16 mx-auto mb-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-700/70 bg-zinc-100/70 dark:bg-zinc-800/50 flex items-center justify-center',
  menuContainer:
    'h-full flex flex-col overflow-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300',
  menuBtnBase:
    'group relative flex h-full min-h-[212px] flex-col items-start text-left rounded-2xl border p-6 md:p-6.5 border-zinc-200/70 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
  menuIconBg:
    'mb-4.5 rounded-xl p-3.5 border border-transparent transition-all bg-zinc-100/70 dark:bg-zinc-800/50 group-hover:bg-white dark:group-hover:bg-zinc-900 group-hover:border-zinc-200/70 dark:group-hover:border-zinc-700/70 group-hover:shadow-indigo-500/10 dark:group-hover:shadow-indigo-500/5',
  detailContainer: 'h-full flex flex-col animate-in fade-in slide-in-from-right-2 duration-300',
  detailHeader:
    'sticky top-0 z-10 h-14 md:h-16 flex items-center px-4 md:px-6 border-b border-zinc-200/70 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-900/80 backdrop-blur-xl',
  backBtn:
    'group h-9 rounded-xl px-2.5 md:px-3 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 focus-visible:ring-2 focus-visible:ring-primary/25'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

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

function SettingsLoading(): React.JSX.Element {
  return (
    <div className={cn(STYLES.fullCenter, STYLES.baseBg)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
        Ayarlar hazırlanıyor...
      </div>
    </div>
  )
}

function SettingsLocked({
  showPinModal,
  setShowPinModal,
  onSuccess
}: {
  showPinModal: boolean
  setShowPinModal: (v: boolean) => void
  onSuccess: () => void
}): React.JSX.Element {
  return (
    <div className={cn(STYLES.fullCenter, STYLES.baseBg, 'p-6')}>
      <div className={STYLES.lockCard}>
        <div className="p-6 text-center">
          <div className={STYLES.lockIconWrap}>
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Ayarlar Kilitli</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Devam etmek için yönetici PIN kodunu girin
          </p>
          <Button
            onClick={() => setShowPinModal(true)}
            className="mt-5 h-10 px-4 rounded-xl text-sm font-medium min-w-[180px]"
          >
            <Lock className="w-4 h-4 mr-2" /> Kilidi Aç
          </Button>
        </div>
      </div>
      <AdminPinModal
        open={showPinModal}
        onOpenChange={setShowPinModal}
        onSuccess={onSuccess}
        title="Yönetici Girişi"
        description="Lütfen 4 haneli PIN kodunu girin"
      />
    </div>
  )
}

function SettingsMenu({
  onLogout,
  onOpenTab
}: {
  onLogout: () => void
  onOpenTab: (id: SettingsTabId) => void
}): React.JSX.Element {
  const prefetchTab = (tabId: SettingsTabId): void => {
    if (tabId === 'general') loadGeneralSettingsTab()
    else if (TAB_COMPONENTS[tabId as Exclude<SettingsTabId, 'general'>]) {
      // Dinamik prefetch
      const componentToLoad = {
        tables: loadTablesTab,
        categories: loadCategoriesTab,
        products: loadProductsTab,
        expenses: loadExpensesTab,
        dashboard: loadDashboardView,
        logs: loadLogsTab,
        maintenance: loadMaintenanceTab
      }[tabId as Exclude<SettingsTabId, 'general'>]
      if (componentToLoad) void componentToLoad()
    }
  }

  return (
    <div className={cn(STYLES.menuContainer, STYLES.baseBg)}>
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        <div className="mb-5 md:mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-3xl font-black tracking-tighter text-foreground">
              Ayarlar
            </h1>
            <p className="text-[15px] text-muted-foreground mt-1.5 font-medium">
              Sistem ve uygulama ayarlarını yönetin
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onLogout}
            className="h-10 rounded-xl px-3.5 text-sm font-medium border-zinc-200/70 dark:border-zinc-700/70 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
          >
            <LogOut className="mr-2 w-4 h-4" /> Çıkış Yap
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 auto-rows-fr">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={`${item.label} sekmesini aç`}
              onClick={() => onOpenTab(item.id)}
              onMouseEnter={() => prefetchTab(item.id)}
              onFocus={() => prefetchTab(item.id)}
              className={STYLES.menuBtnBase}
            >
              <div className={cn(STYLES.menuIconBg, item.color, item.chipBg)}>
                <item.icon className="h-6.5 w-6.5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[19px] font-black tracking-tight text-foreground leading-tight">
                  {item.label}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground font-medium opacity-80 group-hover:opacity-100 transition-opacity">
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

// ============================================================================
// Main Component
// ============================================================================

export function SettingsView({
  isDark,
  onThemeToggle,
  colorScheme,
  onColorSchemeChange
}: SettingsViewProps): React.JSX.Element {
  const [activeView, setActiveView] = useState<SettingsTabId | null>(null)
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

  // Initialize and check PIN
  useEffect(() => {
    const restoreAndCheck = async (): Promise<void> => {
      try {
        const { required } = await cafeApi.admin.checkStatus()
        if (!required) setIsUnlocked(true)
        else setShowPinModal(true)
      } catch (error) {
        console.error('Failed to initialize settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    void restoreAndCheck()
  }, [])

  // Handlers
  const handlePinSuccess = useCallback(() => {
    setIsUnlocked(true)
    setShowPinModal(false)
  }, [])
  const handleLogout = useCallback(() => {
    setIsUnlocked(false)
    setShowPinModal(true)
  }, [])
  const handleBack = useCallback(() => setActiveView(null), [])
  const handleOpenTab = useCallback((id: SettingsTabId) => setActiveView(id), [])

  // ESC key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || !activeView) return
      const hasOpenDialog = Boolean(
        document.querySelector('[role="dialog"][data-state="open"], [data-radix-dialog-content]')
      )
      if (!hasOpenDialog) setActiveView(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeView])

  // DRY (Sadeleştirilmiş) Tab Renderer
  const renderActiveTab = (): React.JSX.Element | null => {
    if (activeView === 'general') {
      return (
        <GeneralSettingsTab
          isDark={isDark}
          onThemeToggle={onThemeToggle}
          colorScheme={colorScheme}
          onColorSchemeChange={onColorSchemeChange}
          activeView={activeView}
        />
      )
    }

    if (!activeView) return null

    const TabComponent = TAB_COMPONENTS[activeView as Exclude<SettingsTabId, 'general'>]
    if (!TabComponent) return null

    return (
      <div className="animate-in slide-in-from-bottom-2 duration-300 h-full">
        <TabComponent />
      </div>
    )
  }

  // Early Returns (JSX Rahatlatma)
  if (isLoading) return <SettingsLoading />
  if (!isUnlocked)
    return (
      <SettingsLocked
        showPinModal={showPinModal}
        setShowPinModal={setShowPinModal}
        onSuccess={handlePinSuccess}
      />
    )
  if (!activeView) return <SettingsMenu onLogout={handleLogout} onOpenTab={handleOpenTab} />

  // Detail View (Geri Dönüşlü Ekran)
  return (
    <div className={cn(STYLES.detailContainer, STYLES.baseBg)}>
      <header className={STYLES.detailHeader}>
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={handleBack} className={STYLES.backBtn}>
            <ArrowLeft className="w-5 h-5 text-zinc-500 group-hover:text-foreground transition-transform group-hover:-translate-x-0.5" />
            <span className="ml-2 hidden sm:inline text-sm font-bold text-zinc-500 group-hover:text-foreground">
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
