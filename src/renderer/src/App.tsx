import { useState, useEffect, Suspense, lazy } from 'react'
import { Coffee, LayoutGrid, Settings, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TablesView } from '@/features/tables/TablesView'
import { OrderView } from '@/features/orders/OrderView'
import { useTableStore } from '@/store/useTableStore'
import { useInventoryStore } from '@/store/useInventoryStore'
import { cn } from '@/lib/utils'
import '@/styles/globals.css'
import { Toaster } from '@/components/ui/toaster'

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
  const { selectTable, fetchTables } = useTableStore()
  const { fetchInventory } = useInventoryStore()

  // Pre-fetch all essential data on mount
  useEffect(() => {
    fetchTables()
    fetchInventory()
  }, [fetchTables, fetchInventory])

  // Apply theme and color scheme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

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
    <div className="fixed inset-0 flex bg-background">
      {/* Sidebar - Fixed width, never shrinks */}
      <aside className="w-20 h-full flex flex-col items-center py-6 px-2 bg-card border-r gap-6">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Coffee className="w-7 h-7 text-primary-foreground" />
        </div>

        <nav className="flex-1 flex flex-col gap-4">
          <Button
            variant={currentView === 'tables' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setCurrentView('tables')}
            className={cn('w-12 h-12 rounded-xl', currentView === 'tables' && 'bg-primary/20')}
            title="Masalar"
          >
            <LayoutGrid className="w-5 h-5" />
          </Button>
        </nav>

        <div className="mt-auto">
          <Button
            variant={currentView === 'settings' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setCurrentView('settings')}
            className={cn('w-12 h-12 rounded-xl', currentView === 'settings' && 'bg-primary/20')}
            title="Ayarlar"
          >
            <Settings className="w-5 h-5" />
          </Button>
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
  )
}

export default App
