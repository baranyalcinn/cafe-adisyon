'use client'

import { TitleBar } from '@/components/TitleBar'
import { Button } from '@/components/ui/button'
import { UpdateNotifier } from '@/components/UpdateNotifier'
import { useInventoryPrefetch } from '@/hooks/useInventory'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { useTableStore } from '@/store/useTableStore'
import '@/styles/globals.css'
import { Toaster } from 'sonner'

// Kritik Ekranlar (Eager Load): Uygulama açılırken hazır gelir.
import { OrderView } from '@/features/orders/OrderView'
import { TablesView } from '@/features/tables/TablesView'

import { LayoutGrid, Loader2, LucideIcon, Settings } from 'lucide-react'
import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition
} from 'react'

// ============================================================================
// Types & Lazy Imports (Code Splitting)
// ============================================================================

type ViewType = 'tables' | 'order' | 'settings'

// Ağır Ayarlar Ekranı (Lazy Load): Sadece tıklandığında yüklenir ve RAM'den atılabilir.
const SettingsView = lazy(() =>
  import('@/features/settings/SettingsView').then((m) => ({ default: m.SettingsView }))
)

// ============================================================================
// Styles
// ============================================================================

const STYLES = {
  appContainer:
    'h-screen flex flex-col overflow-hidden bg-background text-foreground selection:bg-rose-500/30',
  mainLayout: 'flex-1 flex overflow-hidden',
  sidebar:
    'w-20 flex flex-col items-center py-6 bg-background border-r border-border z-50 transition-all duration-500',
  navContainer: 'flex-1 flex flex-col gap-4 pt-10',
  contentArea: 'flex-1 relative bg-muted/5',
  contentWrapper:
    'absolute inset-0 overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-500',
  contentPending: 'opacity-50 pointer-events-none transition-opacity duration-300',

  // NavButton
  navBtnWrap: 'relative px-3 flex flex-col items-center gap-1 group',
  navBtnBase: 'w-12 h-12 rounded-2xl transition-all duration-500 border',
  navBtnActive: 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20',
  navBtnInactive:
    'text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground',
  navIconBase: 'w-6 h-6 transition-all duration-300',
  navIconActive: 'scale-105 opacity-100',
  navIconInactive: 'opacity-80 group-hover:opacity-100 group-hover:scale-105',
  navLabelBase: 'text-[8px] font-black tracking-widest transition-all uppercase',
  navLabelActive: 'text-primary',
  navLabelInactive:
    'text-muted-foreground/60 opacity-0 group-hover:opacity-100 group-hover:text-muted-foreground',

  // Logo
  logoWrap: 'flex flex-col items-center group select-none animate-in fade-in zoom-in duration-1000',
  logoBlurBg:
    'absolute inset-x-0 top-0 bottom-0 bg-primary/5 blur-2xl rounded-full scale-150 group-hover:bg-primary/15 transition-colors duration-1000',
  logoBlocks:
    'w-3.5 h-5 rounded-sm border border-primary/20 bg-primary/10 flex items-center justify-center font-black text-xs transition-all duration-500 group-hover:scale-110 shadow-sm',
  logoText: 'text-[9px] font-black text-primary/80 uppercase tracking-[0.3em] leading-none mt-1.5',

  // Loaders
  bootLoaderWrap: 'h-screen w-screen flex flex-col items-center justify-center bg-background gap-8',
  bootText: 'text-[9px] font-black text-primary/40 tracking-[0.2em] uppercase',
  fallbackWrap:
    'flex items-center justify-center h-full w-full bg-background/40 backdrop-blur-sm absolute inset-0 z-50 animate-in fade-in duration-300'
} as const

// ============================================================================
// Sub-Components
// ============================================================================

interface NavButtonProps {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  label: string
}

const NavButton = ({ active, onClick, icon: Icon, label }: NavButtonProps): React.JSX.Element => (
  <div className={STYLES.navBtnWrap}>
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(STYLES.navBtnBase, active ? STYLES.navBtnActive : STYLES.navBtnInactive)}
    >
      <Icon
        className={cn(STYLES.navIconBase, active ? STYLES.navIconActive : STYLES.navIconInactive)}
      />
    </Button>
    <span
      className={cn(STYLES.navLabelBase, active ? STYLES.navLabelActive : STYLES.navLabelInactive)}
    >
      {label}
    </span>
  </div>
)

const LogoSection = (): React.JSX.Element => {
  const configs = useMemo(
    () => [
      { color: 'text-primary', offset: 'translate-y-0.5', delay: '0s' },
      { color: 'text-primary/90', offset: 'translate-y-0', delay: '0.1s' },
      { color: 'text-primary/70', offset: '-translate-y-0.5', delay: '0.2s' }
    ],
    []
  )

  return (
    <div className={STYLES.logoWrap}>
      <div className="relative p-1 flex flex-col items-center">
        <div className={STYLES.logoBlurBg} />
        <div className="flex flex-col items-center relative z-10">
          <div className="flex items-center gap-0.5">
            {configs.map((config, i) => (
              <div
                key={i}
                style={{ animationDelay: config.delay }}
                className={cn(STYLES.logoBlocks, config.color, config.offset)}
              >
                7
              </div>
            ))}
          </div>
          <span className={STYLES.logoText}>CAFE</span>
        </div>
      </div>
    </div>
  )
}

const BootLoader = (): React.JSX.Element => (
  <div className={STYLES.bootLoaderWrap}>
    <div className="scale-150">
      <LogoSection />
    </div>
    <div className="flex flex-col items-center gap-3 animate-pulse">
      <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary w-1/2 animate-[loading_1.5s_infinite_ease-in-out]" />
      </div>
      <span className={STYLES.bootText}>Sistem Yükleniyor</span>
    </div>
    <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
  </div>
)

const LoadingFallback = (): React.JSX.Element => (
  <div className={STYLES.fallbackWrap}>
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
        </div>
      </div>
      <span className={STYLES.bootText}>Modül Yükleniyor...</span>
    </div>
  </div>
)

// ============================================================================
// Main Application Component
// ============================================================================

export function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>('tables')
  const { isDark, toggleTheme, colorScheme, setColorScheme } = useTheme()
  const selectTable = useTableStore((s) => s.selectTable)
  const clearSelection = useTableStore((s) => s.clearSelection)

  const [isBooting, setIsBooting] = useState<boolean>(true)
  const [isPending, startTransition] = useTransition()
  const { prefetchAll } = useInventoryPrefetch()

  useEffect(() => {
    let mounted = true
    prefetchAll().finally(() => {
      if (mounted) setTimeout(() => setIsBooting(false), 400)
    })
    return () => {
      mounted = false
    }
  }, [prefetchAll])

  const handleTableSelect = useCallback(
    (tableId: string, tableName: string): void => {
      selectTable(tableId, tableName)
      startTransition(() => setCurrentView('order'))
    },
    [selectTable]
  )

  const handleBackToTables = useCallback((): void => {
    clearSelection()
    startTransition(() => setCurrentView('tables'))
  }, [clearSelection])

  const changeView = useCallback((view: ViewType): void => {
    startTransition(() => setCurrentView(view))
  }, [])

  const renderActiveView = (): React.JSX.Element | null => {
    switch (currentView) {
      case 'tables':
        return <TablesView onTableSelect={handleTableSelect} />
      case 'order':
        return <OrderView onBack={handleBackToTables} />
      case 'settings':
        return (
          <SettingsView
            isDark={isDark}
            onThemeToggle={toggleTheme}
            colorScheme={colorScheme}
            onColorSchemeChange={setColorScheme}
          />
        )
      default:
        return null
    }
  }

  if (isBooting) return <BootLoader />

  return (
    <div className={STYLES.appContainer}>
      <TitleBar />

      <div className={STYLES.mainLayout}>
        <aside className={STYLES.sidebar}>
          <LogoSection />

          <nav className={STYLES.navContainer}>
            <NavButton
              active={currentView === 'tables' || currentView === 'order'}
              onClick={(): void => changeView('tables')}
              icon={LayoutGrid}
              label="MASALAR"
            />
          </nav>

          <div className="pb-4">
            <NavButton
              active={currentView === 'settings'}
              onClick={(): void => changeView('settings')}
              icon={Settings}
              label="AYARLAR"
            />
          </div>
        </aside>

        <main className={STYLES.contentArea}>
          <div className={cn(STYLES.contentWrapper, isPending && STYLES.contentPending)}>
            <Suspense fallback={<LoadingFallback />}>{renderActiveView()}</Suspense>
          </div>
        </main>
      </div>

      <Toaster
        position="bottom-right"
        expand={false}
        richColors={false}
        closeButton
        theme={isDark ? 'dark' : 'light'}
      />
      <UpdateNotifier />
    </div>
  )
}

export default App
