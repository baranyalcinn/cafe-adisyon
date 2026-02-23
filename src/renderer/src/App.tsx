import { TitleBar } from '@/components/TitleBar'
import { Button } from '@/components/ui/button'
import { UpdateNotifier } from '@/components/UpdateNotifier'
import { OrderView } from '@/features/orders/OrderView'
import { TablesView } from '@/features/tables/TablesView'
import { useInventoryPrefetch } from '@/hooks/useInventory'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { useTableStore } from '@/store/useTableStore'
import '@/styles/globals.css'
import { Toaster } from 'sonner'

import { LayoutGrid, Loader2, Settings } from 'lucide-react'
import {
  Suspense,
  lazy,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition
} from 'react'

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

  // prefetchAll stabilizes internal ref, but let's ensure it's not the cause of re-renders
  useEffect(() => {
    let mounted = true
    prefetchAll().finally(() => {
      if (mounted) {
        setTimeout(() => setIsBooting(false), 400)
      }
    })
    return () => {
      mounted = false
    }
  }, [prefetchAll])

  // --- useCallback ile fonksiyonları sabitledik ---
  const handleTableSelect = useCallback(
    (tableId: string, tableName: string): void => {
      selectTable(tableId, tableName)
      startTransition(() => setCurrentView('order'))
    },
    [selectTable]
  )

  const handleBackToTables = useCallback((): void => {
    selectTable(null, null)
    startTransition(() => setCurrentView('tables'))
  }, [selectTable])

  const changeView = useCallback((view: ViewType): void => {
    startTransition(() => setCurrentView(view))
  }, []) // Hiçbir bağımlılığı yok, uygulama ömrü boyunca sabit kalır

  if (isBooting) return <BootLoader />

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground selection:bg-rose-500/30">
      <TitleBar />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-20 flex flex-col items-center py-6 bg-background border-r border-border z-50 transition-all duration-500">
          <LogoSection />

          <nav className="flex-1 flex flex-col gap-4 pt-10">
            <NavButton
              active={currentView === 'tables' || currentView === 'order'}
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

        <main className="flex-1 relative bg-muted/5">
          <div
            className={cn(
              'absolute inset-0 overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-500',
              isPending && 'opacity-60 grayscale-[0.3] pointer-events-none'
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

      <Toaster position="top-right" richColors closeButton theme={isDark ? 'dark' : 'light'} />
      <UpdateNotifier />
    </div>
  )
}

// ==========================================
// OPTİMİZE EDİLMİŞ ALT BİLEŞENLER
// ==========================================

interface NavButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}

const NavButton = memo(({ active, onClick, icon: Icon, label }: NavButtonProps) => (
  <div className="relative px-3 flex flex-col items-center gap-1 group">
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(
        'w-12 h-12 rounded-2xl transition-all duration-500 border',
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
          : 'text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground'
      )}
    >
      <Icon
        className={cn(
          'w-6 h-6 transition-all duration-300',
          active
            ? 'scale-105 opacity-100'
            : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'
        )}
      />
    </Button>
    <span
      className={cn(
        'text-[8px] font-black tracking-widest transition-all uppercase',
        active
          ? 'text-primary'
          : 'text-muted-foreground/60 opacity-0 group-hover:opacity-100 group-hover:text-muted-foreground'
      )}
    >
      {label}
    </span>
  </div>
))

// LogoSection: useMemo ile içindeki array'i sabitledik
const LogoSection = memo(() => {
  const configs = useMemo(
    () => [
      { color: 'text-primary', offset: 'translate-y-0.5', delay: '0s' },
      { color: 'text-primary/90', offset: 'translate-y-0', delay: '0.1s' },
      { color: 'text-primary/70', offset: '-translate-y-0.5', delay: '0.2s' }
    ],
    []
  )

  return (
    <div className="flex flex-col items-center group select-none animate-in fade-in zoom-in duration-1000">
      <div className="relative p-1 flex flex-col items-center">
        <div className="absolute inset-x-0 top-0 bottom-0 bg-primary/5 blur-2xl rounded-full scale-150 group-hover:bg-primary/15 transition-colors duration-1000" />
        <div className="flex flex-col items-center gap-1.5 relative z-10">
          <div className="flex items-center gap-0.5">
            {configs.map((config, i) => (
              <div
                key={i}
                style={{ animationDelay: config.delay }}
                className={cn(
                  'w-3.5 h-5 rounded-sm border border-primary/20 bg-primary/10 flex items-center justify-center font-black text-xs transition-all duration-500 group-hover:scale-110 shadow-sm',
                  config.color,
                  config.offset,
                  'group-hover:translate-y-0'
                )}
              >
                7
              </div>
            ))}
          </div>
          <span className="text-[9px] font-black text-primary/80 uppercase tracking-[0.3em] leading-none">
            CAFE
          </span>
        </div>
      </div>
    </div>
  )
})

// BootLoader ve LoadingFallback: Memo ile render maliyetini sıfırladık
const BootLoader = memo(() => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-8">
    <div className="scale-150">
      <LogoSection />
    </div>
    <div className="flex flex-col items-center gap-3 animate-pulse">
      <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary w-1/2 animate-[loading_1.5s_infinite_ease-in-out]" />
      </div>
      <span className="text-[9px] font-black text-primary/40 tracking-[0.2em] uppercase">
        Sistem Yükleniyor
      </span>
    </div>
    <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
  </div>
))

const LoadingFallback = memo(() => (
  <div className="flex items-center justify-center h-full bg-background/20 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
        </div>
      </div>
      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">
        Lütfen Bekleyin
      </span>
    </div>
  </div>
))

export default App
