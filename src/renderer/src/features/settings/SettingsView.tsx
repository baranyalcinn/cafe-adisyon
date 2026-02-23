import { AdminPinModal } from '@/components/ui/AdminPinModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useInventory } from '@/hooks/useInventory'
import { useTables } from '@/hooks/useTables'
import { type ColorScheme } from '@/hooks/useTheme'
import { cafeApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/useSettingsStore'
import { type UpdateInfo } from '@shared/types'
import {
  Activity,
  ArrowLeft,
  ArrowUpCircle,
  CheckCircle2,
  ChevronRight,
  Coffee,
  Database,
  Download,
  History,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  LogOut,
  Moon,
  Palette,
  Receipt,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldCheck,
  Speaker,
  Sun,
  Tags,
  Volume2,
  VolumeX,
  Wrench
} from 'lucide-react'
import React, { Suspense, lazy, useEffect, useState } from 'react'

// Lazy load heavy components
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

// ============================================================================
// ALT BİLEŞEN: GENEL AYARLAR (Ayrıştırılmış Kod Alanı)
// ============================================================================

// Renk Şeması Tanımları
const COLOR_SCHEMES: { id: ColorScheme; name: string; color: string; darkColor: string }[] = [
  {
    id: 'emerald',
    name: 'Zümrüt',
    color: 'oklch(0.55 0.17 155)',
    darkColor: 'oklch(0.65 0.15 155)'
  },
  {
    id: 'ocean',
    name: 'Okyanus',
    color: 'oklch(0.55 0.18 240)',
    darkColor: 'oklch(0.65 0.16 240)'
  },
  { id: 'violet', name: 'Mor', color: 'oklch(0.55 0.2 290)', darkColor: 'oklch(0.65 0.18 290)' },
  { id: 'amber', name: 'Amber', color: 'oklch(0.6 0.16 60)', darkColor: 'oklch(0.7 0.14 60)' },
  { id: 'rose', name: 'Gül', color: 'oklch(0.55 0.18 350)', darkColor: 'oklch(0.65 0.16 350)' }
]

interface GeneralSettingsTabProps {
  isDark: boolean
  onThemeToggle: () => void
  colorScheme: ColorScheme
  onColorSchemeChange: (scheme: ColorScheme) => void
  activeView: string | null
}

export function GeneralSettingsTab({
  isDark,
  onThemeToggle,
  colorScheme,
  onColorSchemeChange,
  activeView
}: GeneralSettingsTabProps): React.JSX.Element {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled)
  const toggleSound = useSettingsStore((state) => state.toggleSound)
  const { data: tables = [], refetch: refetchTables } = useTables()
  const { products, refetchProducts, refetchCategories } = useInventory()

  // PIN ve Güvenlik State'leri
  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinChangeError, setPinChangeError] = useState<string | null>(null)

  const [securityQuestion, setSecurityQuestion] = useState('')
  const [selectedQuestionVal, setSelectedQuestionVal] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [showRecoveryPinModal, setShowRecoveryPinModal] = useState(false)

  const PREDEFINED_QUESTIONS = [
    'İlk evcil hayvanınızın adı?',
    'Annenizin kızlık soyadı?',
    'İlk gittiğiniz okulun adı?',
    'En sevdiğiniz yemek?',
    'Doğduğunuz şehir?'
  ]

  // Güncelleme State'leri
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  >('idle')
  const [appVersion, setAppVersion] = useState<string>('...')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [showDemoPinModal, setShowDemoPinModal] = useState(false)

  // Sürüm Bilgisini Al
  useEffect(() => {
    window.api.system
      .getVersion()
      .then((v) => setAppVersion(`v${v}`))
      .catch(() => setAppVersion('v1.0.0'))
  }, [])

  // KRİTİK DÜZELTME: Electron IPC dinleyicisi için temizleme (cleanup)
  useEffect(() => {
    if (activeView === 'general') {
      const unsubscribe = cafeApi.system.onUpdate((event, data: unknown) => {
        switch (event) {
          case 'checking':
            setUpdateStatus('checking')
            break
          case 'available':
            setUpdateStatus('available')
            setUpdateInfo(data as UpdateInfo)
            break
          case 'not-available':
            setUpdateStatus('not-available')
            break
          case 'progress':
            setUpdateStatus('downloading')
            setDownloadProgress((data as { percent: number })?.percent || 0)
            break
          case 'downloaded':
            setUpdateStatus('downloaded')
            setUpdateInfo(data as UpdateInfo)
            break
          case 'error':
            setUpdateStatus('error')
            break
        }
      })
      return () => {
        if (typeof unsubscribe === 'function') (unsubscribe as () => void)()
      }
    }
    return undefined
  }, [activeView])

  const handleManualUpdateCheck = async (): Promise<void> => {
    setUpdateStatus('checking')
    try {
      const result = await cafeApi.system.checkUpdate()
      if (!result.available) setUpdateStatus('not-available')
    } catch {
      setUpdateStatus('error')
    }
  }

  const handleChangePin = (): void => {
    if (newPin !== '' && (newPin.length !== 4 || newPin !== confirmPin)) {
      setPinChangeError(newPin !== confirmPin ? 'PIN kodları eşleşmiyor' : 'PIN 4 haneli olmalıdır')
      return
    }
    setShowChangePinModal(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* --- GÖRÜNÜM VE TERCİHLER --- */}
        <Card className="rounded-[2.5rem] border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 pt-8 px-8">
            <CardTitle className="flex items-center gap-3 text-xl font-black tracking-tight uppercase">
              <Palette className="w-6 h-6 text-primary" /> Görünüm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            {/* Tema Modu */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                Tema Modu
              </label>
              <div className="grid grid-cols-2 gap-3">
                <ThemeButton
                  active={!isDark}
                  onClick={() => isDark && onThemeToggle()}
                  icon={Sun}
                  label="Aydınlık"
                />
                <ThemeButton
                  active={isDark}
                  onClick={() => !isDark && onThemeToggle()}
                  icon={Moon}
                  label="Karanlık"
                />
              </div>
            </div>

            <div className="h-px bg-border/40" />

            {/* Renk Şeması */}
            <div className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                  Renk Teması
                </label>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">
                  {COLOR_SCHEMES.find((c) => c.id === colorScheme)?.name}
                </span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-muted/20 rounded-2xl">
                {COLOR_SCHEMES.map((scheme) => (
                  <button
                    key={scheme.id}
                    onClick={() => onColorSchemeChange(scheme.id)}
                    className={cn(
                      'relative flex items-center justify-center flex-1 aspect-square rounded-xl transition-all',
                      colorScheme === scheme.id
                        ? 'bg-background shadow-md scale-110 ring-2 ring-primary/20'
                        : 'hover:bg-background/50'
                    )}
                  >
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: isDark ? scheme.darkColor : scheme.color }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-border/40" />

            {/* Ses Ayarları */}
            <div className="flex items-center justify-between py-2 px-1">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted/40 rounded-2xl">
                  <Speaker className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tight">Ses Efektleri</span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Bildirim ve etkileşim sesleri
                  </span>
                </div>
              </div>
              <Button
                onClick={toggleSound}
                variant={soundEnabled ? 'default' : 'outline'}
                className="rounded-xl px-6 h-11 font-black text-xs tracking-widest uppercase transition-all shadow-sm active:scale-95"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" /> AÇIK
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 mr-2" /> KAPALI
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* --- GÜVENLİK MERKEZİ --- */}
        <Card className="rounded-[2.5rem] border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 pt-8 px-8">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-black tracking-tight uppercase">
                <ShieldCheck className="w-6 h-6 text-emerald-500" /> Güvenlik
              </CardTitle>
              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 tracking-widest uppercase">
                GÜVENLİ
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-8 pb-8">
            {/* PIN Değiştirme */}
            <div className="p-5 bg-muted/20 rounded-[1.5rem] border border-border/30 space-y-5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" /> ERİŞİM ŞİFRELEME (PIN)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <PinInput
                  label="YENİ PIN"
                  value={newPin}
                  onChange={(v) => {
                    setNewPin(v)
                    setPinChangeError(null)
                  }}
                />
                <PinInput
                  label="TEKRAR GİRİN"
                  value={confirmPin}
                  onChange={(v) => {
                    setConfirmPin(v)
                    setPinChangeError(null)
                  }}
                />
              </div>
              <Button
                onClick={handleChangePin}
                disabled={newPin.length !== 4 || confirmPin.length !== 4}
                className="w-full h-12 text-xs font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-primary/10"
              >
                GÜNCELLEMEYİ ONAYLA
              </Button>
              {pinChangeError && (
                <div className="text-[11px] font-bold text-rose-500 bg-rose-500/10 p-2 rounded-lg text-center uppercase tracking-wider">
                  {pinChangeError}
                </div>
              )}
            </div>

            {/* Hesap Kurtarma */}
            <div className="p-5 bg-muted/20 rounded-[1.5rem] border border-border/30 space-y-4">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> HESAP KURTARMA
              </label>
              <Select
                value={selectedQuestionVal}
                onValueChange={(val) => {
                  setSelectedQuestionVal(val)
                  setSecurityQuestion(val !== 'custom' ? val : '')
                }}
              >
                <SelectTrigger className="w-full text-xs h-11 bg-background rounded-xl border-none font-bold uppercase tracking-wider px-4">
                  <SelectValue placeholder="BİR SORU SEÇİN" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {PREDEFINED_QUESTIONS.map((q) => (
                    <SelectItem key={q} value={q} className="text-xs font-bold py-3 rounded-xl">
                      {q}
                    </SelectItem>
                  ))}
                  <SelectItem
                    value="custom"
                    className="text-xs font-black py-3 border-t uppercase text-primary"
                  >
                    Kendi sorumu yazacağım...
                  </SelectItem>
                </SelectContent>
              </Select>
              {selectedQuestionVal === 'custom' && (
                <Input
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  placeholder="Güvenlik sorunuzu yazın..."
                  className="h-11 rounded-xl bg-background border-none text-xs font-bold"
                />
              )}
              <Input
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Cevabınızı yazın..."
                className="h-11 rounded-xl bg-background border-none text-xs font-bold"
              />
              <Button
                onClick={() => setShowRecoveryPinModal(true)}
                disabled={!securityQuestion || !securityAnswer}
                variant="outline"
                className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl"
              >
                YÖNTEMİ KAYDET
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- GÜNCELLEME VE SİSTEM DURUMU --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch pb-4">
        {/* Yazılım Güncelleme */}
        <Card className="rounded-[2.5rem] border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 pt-8 px-8 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-black tracking-tight uppercase">
              <ArrowUpCircle className="w-6 h-6 text-primary" /> Güncelleme
            </CardTitle>
            <span className="text-[10px] font-black px-3 py-1 rounded-full bg-muted border border-border/50 font-mono tracking-tighter uppercase">
              {appVersion}
            </span>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <UpdateStatusArea
              status={updateStatus}
              progress={downloadProgress}
              info={updateInfo}
              onCheck={handleManualUpdateCheck}
            />
          </CardContent>
        </Card>

        {/* Sistem Durumu */}
        <Card className="rounded-[2.5rem] border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 pt-8 px-8">
            <CardTitle className="flex items-center gap-3 text-xl font-black tracking-tight uppercase">
              <Activity className="w-6 h-6 text-blue-500" /> Sistem Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="p-5 bg-muted/20 border border-border/40 rounded-[1.5rem] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-background rounded-2xl border border-border/50 shadow-sm">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-tight">Veritabanı</p>
                  <p className="text-[11px] font-black text-emerald-500 flex items-center gap-2 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> SAĞLIKLI
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <StatItem label="Masa" value={tables.length} />
                <StatItem label="Ürün" value={products.length} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SystemActionButton
                onClick={() => setShowDemoPinModal(true)}
                icon={RefreshCw}
                label="DEMO YÜKLE"
                color="text-blue-500"
              />
              <SystemActionButton
                onClick={async () => {
                  await Promise.all([refetchTables(), refetchProducts(), refetchCategories()])
                  alert('Sistem kontrolü tamamlandı.')
                }}
                icon={Wrench}
                label="KONTROL ET"
                color="text-amber-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODALLAR */}
      <AdminPinModal
        open={showChangePinModal}
        onOpenChange={setShowChangePinModal}
        title="PIN Onayı"
        description="Mevcut yönetici şifresini girin"
        onSuccess={async () => {
          await cafeApi.admin.changePin('', newPin === '' && confirmPin === '' ? '' : newPin)
          setNewPin('')
          setConfirmPin('')
          alert('PIN güncellendi')
          setShowChangePinModal(false)
        }}
      />
      <AdminPinModal
        open={showRecoveryPinModal}
        onOpenChange={setShowRecoveryPinModal}
        title="Güvenlik Onayı"
        description="İşlemi onaylamak için PIN girin"
        onSuccess={async () => {
          await cafeApi.admin.setRecovery('', securityQuestion, securityAnswer)
          setSecurityAnswer('')
          setSecurityQuestion('')
          setSelectedQuestionVal('')
          alert('Yöntem kaydedildi')
          setShowRecoveryPinModal(false)
        }}
      />
      <AdminPinModal
        open={showDemoPinModal}
        onOpenChange={setShowDemoPinModal}
        title="Kritik İşlem"
        description="Demo yüklemek için PIN girin"
        onSuccess={async () => {
          setShowDemoPinModal(false)
          setTimeout(async () => {
            if (confirm('DİKKAT: Mevcut tüm veriler silinecektir!')) {
              await cafeApi.seed.database()
              await Promise.all([refetchTables(), refetchProducts(), refetchCategories()])
            }
          }, 100)
        }}
      />
    </div>
  )
}

// ==========================================
// YARDIMCI KÜÇÜK BİLEŞENLER (Temizlik İçin)
// ==========================================

const ThemeButton = ({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}): React.ReactNode => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-3 p-4 rounded-2xl border transition-all',
      active
        ? 'border-primary bg-primary/5 ring-2 ring-primary/10'
        : 'border-border/60 hover:bg-muted/50'
    )}
  >
    <div
      className={cn(
        'p-2 rounded-xl',
        active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
      )}
    >
      <Icon className="w-5 h-5" />
    </div>
    <span
      className={cn(
        'text-sm font-black uppercase tracking-widest',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      {label}
    </span>
  </button>
)

const PinInput = ({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (v: string) => void
}): React.ReactNode => (
  <div className="space-y-3 flex flex-col items-center sm:items-start">
    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
      {label}
    </span>
    <InputOTP maxLength={4} value={value} onChange={onChange}>
      <InputOTPGroup className="gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <InputOTPSlot
            key={i}
            index={i}
            className="rounded-xl border-2 h-12 w-12 text-lg font-black shadow-sm bg-background"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  </div>
)

const StatItem = ({ label, value }: { label: string; value: number | string }): React.ReactNode => (
  <div className="text-right">
    <p className="text-2xl font-black text-primary tabular-nums leading-none tracking-tighter">
      {value}
    </p>
    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2 opacity-60">
      {label}
    </p>
  </div>
)

const SystemActionButton = ({
  onClick,
  icon: Icon,
  label,
  color
}: {
  onClick: () => void
  icon: React.ElementType
  label: string
  color: string
}): React.ReactNode => (
  <Button
    onClick={onClick}
    variant="outline"
    className={cn(
      'h-20 flex flex-col gap-2 items-center justify-center rounded-[1.5rem] border-none bg-muted/30 hover:bg-muted/50 transition-all active:scale-95 shadow-sm'
    )}
  >
    <Icon className={cn('w-6 h-6', color)} />
    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{label}</span>
  </Button>
)

const UpdateStatusArea = ({
  status,
  progress,
  info,
  onCheck
}: {
  status: string
  progress: number
  info: UpdateInfo | null
  onCheck: () => void
}): React.ReactNode => {
  if (status === 'checking')
    return (
      <div className="flex items-center justify-center gap-4 py-12 bg-muted/10 rounded-3xl border border-dashed border-border/50">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">
          KONTROL EDİLİYOR...
        </p>
      </div>
    )

  if (status === 'available' || status === 'downloading')
    return (
      <div className="p-6 bg-primary/5 border border-primary/20 rounded-[2rem] space-y-5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-tight">Yeni Sürüm Mevcut</p>
            <p className="text-[11px] font-bold text-primary/70 uppercase tracking-widest">
              v{info?.version} İNDİRİLİYOR
            </p>
          </div>
        </div>
        <div className="h-3 w-full bg-primary/10 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-primary transition-all duration-500 shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-right font-black text-primary tabular-nums">%{progress}</p>
      </div>
    )

  if (status === 'downloaded')
    return (
      <Button
        onClick={() => cafeApi.system.restart()}
        className="w-full h-20 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] flex flex-col gap-1 shadow-xl shadow-emerald-500/20"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />{' '}
          <span className="font-black uppercase tracking-widest">İNDİRME TAMAMLANDI</span>
        </div>
        <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider text-white/90">
          Yeniden Başlat ve Yükle
        </span>
      </Button>
    )

  return (
    <div className="flex items-center justify-between p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem]">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-500/10 rounded-2xl">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-black uppercase tracking-tight">Sistem Güncel</p>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            En son sürümdesiniz
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        onClick={onCheck}
        className="h-12 px-6 font-black text-xs tracking-widest uppercase hover:bg-emerald-500/10 rounded-xl"
      >
        DENETLE
      </Button>
    </div>
  )
}
