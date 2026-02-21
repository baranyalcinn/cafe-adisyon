import { TitleBar } from '@/components/TitleBar'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { UpdateNotifier } from '@/components/UpdateNotifier'
import { OrderView } from '@/features/orders/OrderView'
import { TablesView } from '@/features/tables/TablesView'
import { useInventoryPrefetch } from '@/hooks/useInventory'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { useTableStore } from '@/store/useTableStore'
import '@/styles/globals.css'

import { LayoutGrid, Loader2, Settings } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useState, useTransition } from 'react'

const SettingsView = lazy(() =>
  import('@/features/settings/SettingsView').then((m) => ({ default: m.SettingsView }))
)

type ViewType = 'tables' | 'order' | 'settings'

function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>('tables')
  const { isDark, toggleTheme, colorScheme, setColorScheme } = useTheme()
  const selectTable = useTableStore((s) => s.selectTable)

  const [isBooting, setIsBooting] = useState(true)
  const [isPending, startTransition] = useTransition()
  const { prefetchAll } = useInventoryPrefetch()

  useEffect(() => {
    prefetchAll().finally(() => setIsBooting(false))
  }, [prefetchAll])

  const handleTableSelect = useCallback(
    (tableId: string, tableName: string): void => {
      selectTable(tableId, tableName)
      // Transition ile geçişi yumuşatıyoruz
      startTransition(() => {
        setCurrentView('order')
      })
    },
    [selectTable]
  )

  const handleBackToTables = useCallback((): void => {
    selectTable(null, null)
    startTransition(() => {
      setCurrentView('tables')
    })
  }, [selectTable])

  const changeView = (view: ViewType): void => {
    startTransition(() => {
      setCurrentView(view)
    })
  }

  if (isBooting) {
    return <LoadingFallback />
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-20 flex flex-col items-center py-6 bg-card/40 backdrop-blur-2xl border-r border-border/20 z-50 transition-all duration-500">
          <LogoSection />

          <nav className="flex-1 flex flex-col gap-4 pt-10">
            <NavButton
              active={currentView === 'tables'}
              onClick={() => changeView('tables')}
              icon={LayoutGrid}
              label="MASALAR"
            />
          </nav>

          <div className="pb-4">
            <NavButton
              active={currentView === 'settings'}
              onClick={() => changeView('settings')}
              icon={Settings}
              label="AYARLAR"
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 relative bg-muted/5">
          <div
            key={currentView}
            className={cn(
              'absolute inset-0 overflow-hidden animate-in fade-in duration-300',
              isPending && 'opacity-70 pointer-events-none' // Yüklenirken hafif silikleşir
            )}
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
          </div>
        </main>
      </div>

      <Toaster />
      <UpdateNotifier />
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
          'w-12 h-12 rounded-2xl transition-all duration-500 group overflow-hidden',
          active
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 hover:text-primary-foreground'
            : 'text-foreground/80 hover:text-foreground hover:bg-muted/40'
        )}
        title={label}
      >
        <Icon
          className={cn(
            'w-5 h-5 transition-all duration-500',
            active ? 'scale-110' : 'scale-100 group-hover:scale-110'
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
          {/* Staggered Vertical 7s */}
          <div className="flex items-center gap-1">
            {[
              { color: 'text-rose-500', offset: 'translate-y-1', delay: '0s' },
              { color: 'text-rose-500/90', offset: 'translate-y-0', delay: '0.1s' },
              { color: 'text-rose-500/65', offset: '-translate-y-1', delay: '0.2s' }
            ].map((config, i) => (
              <div
                key={i}
                style={{ animationDelay: config.delay }}
                className={cn(
                  'w-4 h-6 rounded-md border border-rose-500/10 bg-rose-500/[0.02] dark:bg-rose-500/[0.05] flex items-center justify-center font-[1000] text-base transition-all duration-500 group-hover:border-rose-500/30 group-hover:bg-rose-500/10 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both',
                  config.color,
                  config.offset,
                  'group-hover:translate-y-0'
                )}
              >
                7
              </div>
            ))}
          </div>

          {/* Minimalist Cafe Text */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-rose-500/70 dark:text-rose-500/50 uppercase tracking-[0.3em] transition-all duration-500 group-hover:text-rose-500 group-hover:tracking-[0.45em] relative">
              CAFE
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
      <div className="flex flex-col items-center gap-2 animate-in fade-in duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">Yükleniyor...</span>
      </div>
    </div>
  )
}

export default App
