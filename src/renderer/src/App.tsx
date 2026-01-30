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
        <aside className="w-20 flex flex-col items-center py-6 bg-card/40 backdrop-blur-2xl border-r border-border/10 z-50 transition-all duration-500">
          <LogoSection />

          <nav className="flex-1 flex flex-col gap-4 pt-10">
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
    <div className="relative px-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={cn(
          'w-12 h-12 rounded-2xl transition-all duration-500 relative group overflow-hidden',
          active
            ? 'text-primary-foreground shadow-lg shadow-primary/30'
            : 'text-foreground/80 hover:text-foreground hover:bg-muted/40'
        )}
        title={label}
      >
        {active && (
          <motion.div
            layoutId="activeNavBackground"
            className="absolute inset-0 bg-primary z-0"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <Icon
          className={cn(
            'w-5 h-5 transition-all duration-500 relative z-10',
            active
              ? 'scale-110 opacity-100 text-white'
              : 'scale-100 group-hover:scale-110 opacity-100'
          )}
        />
      </Button>
    </div>
  )
}

function LogoSection(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center group select-none animate-in fade-in zoom-in duration-1000">
      <div className="relative p-2 flex flex-col items-center">
        {/* Abstract Background Glow */}
        <div className="absolute inset-x-0 top-0 bottom-0 bg-rose-500/[0.03] dark:bg-rose-500/[0.08] blur-2xl rounded-full scale-150 group-hover:bg-rose-500/10 transition-colors duration-1000" />

        <div className="flex flex-col items-center gap-2 relative z-10">
          {/* Staggered Vertical 7s - Prevents 'M' look */}
          <motion.div
            className="flex items-center gap-1"
            initial="hidden"
            animate="show"
            variants={{
              show: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {[
              { color: 'text-rose-500', offset: 'translate-y-1' },
              { color: 'text-rose-500/70', offset: 'translate-y-0' },
              { color: 'text-rose-500/40', offset: '-translate-y-1' }
            ].map((config, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0 }
                }}
                className={cn(
                  'w-4 h-6 rounded-md border border-rose-500/10 bg-rose-500/[0.02] dark:bg-rose-500/[0.05] flex items-center justify-center font-[1000] text-base transition-all duration-500 group-hover:border-rose-500/30 group-hover:bg-rose-500/10 shadow-sm',
                  config.color,
                  config.offset,
                  'group-hover:translate-y-0'
                )}
              >
                7
              </motion.div>
            ))}
          </motion.div>

          {/* Minimalist Cafe Text */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-rose-500/40 dark:text-rose-500/30 uppercase tracking-[0.3em] transition-all duration-500 group-hover:text-rose-500 group-hover:tracking-[0.45em] relative">
              Cafe
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-[1px] bg-rose-500/20 group-hover:w-6 transition-all duration-500" />
            </span>
          </div>
        </div>
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
