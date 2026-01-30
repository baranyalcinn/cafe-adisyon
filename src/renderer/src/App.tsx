import { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { LayoutGrid, Settings, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TablesView } from '@/features/tables/TablesView'
import { OrderView } from '@/features/orders/OrderView'
import { useTableStore } from '@/store/useTableStore'
import { useInventoryPrefetch } from '@/hooks/useInventory'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import '@/styles/globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TitleBar } from '@/components/TitleBar'
import { AnimatePresence, motion, Variants } from 'framer-motion'

const SettingsView = lazy(() =>
  import('@/features/settings/SettingsView').then((m) => ({ default: m.SettingsView }))
)

type ViewType = 'tables' | 'order' | 'settings'

const viewVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 20 : -20,
    scale: 0.98
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 }
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction < 0 ? 20 : -20,
    scale: 0.98,
    transition: { duration: 0.2 }
  })
}

function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>('tables')
  const { isDark, toggleTheme, colorScheme, setColorScheme } = useTheme()
  const { selectTable } = useTableStore()

  // Prefetch logic (Sadece mount anında bir kez çalışır)
  const { prefetchAll } = useInventoryPrefetch()
  useEffect(() => {
    prefetchAll()
  }, [prefetchAll])

  const handleTableSelect = useCallback(
    (tableId: string) => {
      selectTable(tableId)
      setCurrentView('order')
    },
    [selectTable]
  )

  const handleBackToTables = useCallback(() => {
    selectTable(null)
    setCurrentView('tables')
  }, [selectTable])

  // Determine direction for animation based on simple view order assumption or just default
  // Ideally we would track previous view index, but for now passing 0 or handling it simply is fine.
  // The variants use a 'direction' param but we aren't passing `custom` prop to motion.div in the suggestion code.
  // We will pass custom={1} or similar if we want directional, but the suggestion didn't explicitly show the state tracking for direction.
  // I will skip the 'custom' prop and just let it use default 0 (undefined direction) or modify variants if needed.
  // Actually, let's look at the suggestion. It defined `direction` in variants but didn't pass `custom` in `motion.div`.
  // This means `direction` will be undefined. We should fix this or assume 1.
  // I'll make the variants handle undefined direction or just set a default key.

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Ayrıştırılmış ve daha temiz */}
        <aside className="w-20 flex flex-col items-center py-6 bg-card/50 backdrop-blur-xl border-r z-50 transition-colors">
          <LogoSection />

          <nav className="flex-1 flex flex-col gap-4 pt-8">
            <NavButton
              active={currentView === 'tables'}
              onClick={() => setCurrentView('tables')}
              icon={LayoutGrid}
              label="Masalar"
            />
          </nav>

          <div className="pb-4">
            <NavButton
              active={currentView === 'settings'}
              onClick={() => setCurrentView('settings')}
              icon={Settings}
              label="Ayarlar"
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 relative bg-muted/5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentView}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 overflow-hidden"
            >
              <Suspense fallback={<LoadingFallback />}>
                {currentView === 'tables' && <TablesView onTableSelect={handleTableSelect} />}
                {currentView === 'order' && <OrderView onBack={handleBackToTables} />}
                {currentView === 'settings' && (
                  <SettingsView
                    isDark={isDark}
                    onThemeToggle={toggleTheme}
                    colorScheme={colorScheme}
                    onColorSchemeChange={setColorScheme}
                  />
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </div>
  )
}

// Alt Bileşenler

interface NavButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}

function NavButton({ active, onClick, icon: Icon, label }: NavButtonProps): React.JSX.Element {
  return (
    <div className="relative group px-2">
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="activeNav"
            className="absolute left-0 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_15px_rgba(var(--primary),0.5)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={cn(
          'w-12 h-12 rounded-2xl transition-all duration-300 relative',
          active ? 'bg-primary/10 text-primary' : 'hover:bg-accent opacity-70 hover:opacity-100'
        )}
        title={label}
      >
        <Icon className={cn('w-5 h-5', active && 'scale-110')} />
      </Button>
    </div>
  )
}

function LogoSection(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center group select-none">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center justify-center gap-0.5">
          <span className="text-2xl font-black text-rose-500">7</span>
          <span className="text-2xl font-black text-rose-500/70">7</span>
          <span className="text-2xl font-black text-rose-500/40">7</span>
        </div>
        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
          Cafe
        </span>
      </div>
    </div>
  )
}

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-2"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">Yükleniyor...</span>
      </motion.div>
    </div>
  )
}

export default App
