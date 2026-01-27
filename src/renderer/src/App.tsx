import { useState, useEffect, Suspense, lazy } from 'react'
import { Coffee, LayoutGrid, Settings, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TablesView } from '@/features/tables/TablesView'
import { OrderView } from '@/features/orders/OrderView'
import { useTableStore } from '@/store/useTableStore'
import { useInventoryPrefetch } from '@/hooks/useInventory'
import { cn } from '@/lib/utils'
import '@/styles/globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Lazy load SettingsView (not used frequently)
const SettingsView = lazy(() =>
  import('@/features/settings/SettingsView').then((m) => ({ default: m.SettingsView }))
)

type ViewType = 'tables' | 'order' | 'settings'
export type ColorScheme = 'emerald' | 'ocean' | 'violet' | 'amber' | 'rose'

// Loading fallback component
function LoadingFallback(): React.JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )
}

function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>('tables')
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    const saved = localStorage.getItem('colorScheme')
    return (saved as ColorScheme) || 'emerald'
  })
  // Pre-fetch calls removed in frame of React Query migration
  // Data is now fetched by components using useQuery hooks

  // Apply theme and color scheme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const { selectTable } = useTableStore()
  const { prefetchAll } = useInventoryPrefetch()

  // Prefetch menu data on mount
  useEffect(() => {
    prefetchAll()
  }, [prefetchAll])

  useEffect(() => {
    document.documentElement.setAttribute('data-scheme', colorScheme)
    localStorage.setItem('colorScheme', colorScheme)
  }, [colorScheme])

  const handleTableSelect = (tableId: string): void => {
    selectTable(tableId)
    setCurrentView('order')
  }

  const handleBackToTables = (): void => {
    selectTable(null)
    setCurrentView('tables')
  }

  const toggleTheme = (): void => {
    setIsDark(!isDark)
  }

  const handleColorSchemeChange = (scheme: ColorScheme): void => {
    setColorScheme(scheme)
  }

  return (
    <>
      <div className="fixed inset-0 flex bg-background">
        <aside className="w-20 h-full flex flex-col items-center py-8 px-2 bg-card/80 backdrop-blur-xl border-r gap-8 z-50">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer">
            <Coffee className="w-6 h-6 text-primary" />
          </div>

          <nav className="flex-1 flex flex-col gap-6 pt-4">
            <div className="relative group">
              {currentView === 'tables' && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_12px_rgba(var(--primary),0.5)]" />
              )}
              <Button
                variant={currentView === 'tables' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setCurrentView('tables')}
                className={cn(
                  'w-12 h-12 rounded-2xl transition-all duration-300',
                  currentView === 'tables'
                    ? 'bg-primary/15 text-primary shadow-inner'
                    : 'hover:bg-accent/50'
                )}
                title="Masalar"
              >
                <LayoutGrid
                  className={cn(
                    'w-5 h-5 transition-transform duration-300',
                    currentView === 'tables' && 'scale-110'
                  )}
                />
              </Button>
            </div>
          </nav>

          <div className="mt-auto pb-4">
            <div className="relative group">
              {currentView === 'settings' && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_12px_rgba(var(--primary),0.5)]" />
              )}
              <Button
                variant={currentView === 'settings' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setCurrentView('settings')}
                className={cn(
                  'w-12 h-12 rounded-2xl transition-all duration-300',
                  currentView === 'settings'
                    ? 'bg-primary/15 text-primary shadow-inner'
                    : 'hover:bg-accent/50'
                )}
                title="Ayarlar"
              >
                <Settings
                  className={cn(
                    'w-5 h-5 transition-transform duration-300',
                    currentView === 'settings' && 'scale-110'
                  )}
                />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 h-full overflow-hidden">
          {currentView === 'tables' && <TablesView onTableSelect={handleTableSelect} />}
          {currentView === 'order' && <OrderView onBack={handleBackToTables} />}
          {currentView === 'settings' && (
            <Suspense fallback={<LoadingFallback />}>
              <SettingsView
                isDark={isDark}
                onThemeToggle={toggleTheme}
                colorScheme={colorScheme}
                onColorSchemeChange={handleColorSchemeChange}
              />
            </Suspense>
          )}
        </main>
        <Toaster />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}

export default App
