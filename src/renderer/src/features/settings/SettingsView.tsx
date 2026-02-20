import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Activity,
  AlertCircle,
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
import { Suspense, lazy, useEffect, useState } from 'react'
// Re-add missing imports
import { AdminPinModal } from '@/components/ui/AdminPinModal'
import { useInventory } from '@/hooks/useInventory'
import { useTables } from '@/hooks/useTables'
import { type ColorScheme } from '@/hooks/useTheme'
import { cafeApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/useSettingsStore'
import { type UpdateInfo } from '@shared/types'

// Lazy load heavy components
const DashboardView = lazy(() =>
  import('@/features/dashboard/DashboardView').then((module) => ({ default: module.DashboardView }))
)
const TablesTab = lazy(() =>
  import('./tabs/TablesTab').then((module) => ({ default: module.TablesTab }))
)
const CategoriesTab = lazy(() =>
  import('./tabs/CategoriesTab').then((module) => ({ default: module.CategoriesTab }))
)
const ProductsTab = lazy(() =>
  import('./tabs/ProductsTab').then((module) => ({ default: module.ProductsTab }))
)
const LogsTab = lazy(() => import('./tabs/LogsTab').then((module) => ({ default: module.LogsTab })))
const MaintenanceTab = lazy(() =>
  import('./tabs/MaintenanceTab').then((module) => ({ default: module.MaintenanceTab }))
)
const ExpensesTab = lazy(() =>
  import('./tabs/ExpensesTab').then((module) => ({ default: module.ExpensesTab }))
)

interface SettingsViewProps {
  isDark: boolean
  onThemeToggle: () => void
  colorScheme: ColorScheme
  onColorSchemeChange: (scheme: ColorScheme) => void
}

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
  const soundEnabled = useSettingsStore((state) => state.soundEnabled)
  const toggleSound = useSettingsStore((state) => state.toggleSound)
  const { data: tables = [], refetch: refetchTables } = useTables()
  const { products, refetchProducts, refetchCategories } = useInventory()
  const tableCount = tables.length
  const productCount = products.length
  const [activeView, setActiveView] = useState<string | null>(null)

  // PIN verification state
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // PIN change state
  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinChangeError, setPinChangeError] = useState<string | null>(null)
  const [showDemoPinModal, setShowDemoPinModal] = useState(false)

  // Check PIN status on mount
  useEffect(() => {
    const checkPinStatus = async (): Promise<void> => {
      try {
        const { required } = await cafeApi.admin.checkStatus()
        if (!required) {
          setIsUnlocked(true)
        }
      } catch (error) {
        console.error('Failed to check PIN status:', error)
      } finally {
        setIsLoading(false)
      }
    }
    checkPinStatus()
  }, [])

  // Recovery Settings state
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [selectedQuestionVal, setSelectedQuestionVal] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [showRecoveryPinModal, setShowRecoveryPinModal] = useState(false)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  const PREDEFINED_QUESTIONS = [
    'İlk evcil hayvanınızın adı?',
    'Annenizin kızlık soyadı?',
    'İlk gittiğiniz okulun adı?',
    'En sevdiğiniz yemek?',
    'Doğduğunuz şehir?'
  ]

  // --- Software Update State ---
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  >('idle')
  const [appVersion, setAppVersion] = useState<string>('...')

  useEffect(() => {
    const getVersion = async (): Promise<void> => {
      try {
        const version = await window.api.system.getVersion()
        setAppVersion(`v${version}`)
      } catch (error) {
        console.error('Failed to get version:', error)
        setAppVersion('v1.0.0')
      }
    }
    getVersion()
  }, [])
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  useEffect(() => {
    if (activeView === 'general') {
      cafeApi.system.onUpdate((event, data: unknown) => {
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
            setDownloadProgress((data as { percent: number }).percent)
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
    }
  }, [activeView])

  const handleManualUpdateCheck = async (): Promise<void> => {
    try {
      setUpdateStatus('checking')
      const result = await cafeApi.system.checkUpdate()
      if (!result.available) {
        setUpdateStatus('not-available')
      }
    } catch (err) {
      console.error('Update check failed:', err)
      setUpdateStatus('error')
    }
  }

  const handleRestartAndInstall = (): void => {
    cafeApi.system.restart()
  }

  const handlePinSuccess = (): void => {
    setIsUnlocked(true)
    setShowPinModal(false)
  }

  const handleChangePin = async (): Promise<void> => {
    // Both empty = Clear PIN
    const clearingPin = newPin === '' && confirmPin === ''

    if (!clearingPin) {
      if (newPin.length !== 4) {
        setPinChangeError('PIN 4 haneli olmalıdır')
        return
      }
      if (newPin !== confirmPin) {
        setPinChangeError('PIN kodları eşleşmiyor')
        return
      }
    }

    setShowChangePinModal(true)
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
            if (!open && !isUnlocked) {
              setShowPinModal(false)
            } else {
              setShowPinModal(open)
            }
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
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Ayarlar</h1>
            </div>
            <Button
              variant="outline"
              size="default"
              className="h-10 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setIsUnlocked(false)}
            >
              <LogOut className="mr-2.5 w-5 h-5" />
              Çıkış Yap
            </Button>
          </div>

          {/* Grid Menu */}
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
          ![
            'products',
            'dashboard',
            'tables',
            'categories',
            'logs',
            'expenses',
            'maintenance'
          ].includes(activeView || '')
            ? 'overflow-auto p-6'
            : 'overflow-hidden'
        )}
      >
        <div
          className={cn(
            'h-full',
            ![
              'products',
              'dashboard',
              'tables',
              'categories',
              'logs',
              'expenses',
              'maintenance'
            ].includes(activeView || '')
              ? 'max-w-6xl mx-auto space-y-6'
              : 'w-full'
          )}
        >
          {/* Content Area with Suspense */}
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            }
          >
            {activeView === 'general' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Row 1: Appearance & Security */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                  {/* Appearance Card */}
                  <Card className="rounded-2xl border bg-card shadow-sm h-full">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <CardTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
                        <Palette className="w-5 h-5 text-primary" />
                        Görünüm ve Tercihler
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 px-5 pb-5">
                      {/* Theme Mode */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-[0.15em] ml-1">
                          Tema Modu
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            onClick={() => isDark && onThemeToggle()}
                            className={cn(
                              'flex items-center gap-2.5 p-3 rounded-xl border transition-all',
                              !isDark
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/10'
                                : 'border-border hover:bg-accent/50'
                            )}
                          >
                            <div
                              className={cn(
                                'p-1.5 rounded-lg',
                                !isDark ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                              )}
                            >
                              <Sun className="w-4 h-4" />
                            </div>
                            <span
                              className={cn(
                                'text-sm font-medium',
                                !isDark ? 'text-primary' : 'text-muted-foreground'
                              )}
                            >
                              Aydınlık
                            </span>
                          </button>
                          <button
                            onClick={() => !isDark && onThemeToggle()}
                            className={cn(
                              'flex items-center gap-2.5 p-3 rounded-xl border transition-all',
                              isDark
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/10'
                                : 'border-border hover:bg-accent/50'
                            )}
                          >
                            <div
                              className={cn(
                                'p-1.5 rounded-lg',
                                isDark ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                              )}
                            >
                              <Moon className="w-4 h-4" />
                            </div>
                            <span
                              className={cn(
                                'text-sm font-medium',
                                isDark ? 'text-primary' : 'text-muted-foreground'
                              )}
                            >
                              Karanlık
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="h-px bg-border/50" />

                      {/* Color Scheme */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-[0.15em]">
                            Renk Teması
                          </label>
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">
                            {COLOR_SCHEMES.find((c) => c.id === colorScheme)?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded-xl">
                          {COLOR_SCHEMES.map((scheme) => (
                            <button
                              key={scheme.id}
                              onClick={() => onColorSchemeChange(scheme.id)}
                              title={scheme.name}
                              className={cn(
                                'relative flex items-center justify-center w-full aspect-square rounded-lg transition-all',
                                colorScheme === scheme.id
                                  ? 'bg-background shadow-sm ring-1 ring-border scale-110'
                                  : 'hover:bg-background/50'
                              )}
                            >
                              <div
                                className="w-6 h-6 rounded-full border border-white/30 dark:border-black/20"
                                style={{
                                  backgroundColor: isDark ? scheme.darkColor : scheme.color
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-border/50" />

                      {/* Sound */}
                      <div className="flex items-center justify-between py-2 px-1">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted/40 rounded-lg">
                            <Speaker className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <span className="text-sm font-bold block leading-none mb-1">
                              Ses Efektleri
                            </span>
                            <span className="text-xs text-muted-foreground/90">
                              Bildirim ve etkileşim sesleri
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={toggleSound}
                          variant={soundEnabled ? 'default' : 'outline'}
                          size="sm"
                          className="rounded-full px-6 h-10 text-sm font-bold shadow-sm transition-all active:scale-95"
                        >
                          {soundEnabled ? (
                            <>
                              <Volume2 className="w-3.5 h-3.5 mr-1.5" /> Açık
                            </>
                          ) : (
                            <>
                              <VolumeX className="w-3.5 h-3.5 mr-1.5" /> Kapalı
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security Card */}
                  <Card className="rounded-2xl border bg-card shadow-sm h-full">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
                          <ShieldCheck className="w-5 h-5 text-success" />
                          Güvenlik Merkezi
                        </CardTitle>
                        <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-success/10 text-success border border-success/20 tracking-widest">
                          GÜVENLİ
                        </span>
                      </div>
                      <CardDescription className="text-sm text-muted-foreground/80 font-medium">
                        PIN yönetimi ve güvenlik seçenekleri
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-5 pb-5">
                      {/* PIN Section */}
                      <div className="p-4 bg-muted/20 rounded-xl border border-border/50 space-y-4">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2 ml-1">
                          <KeyRound className="w-3.5 h-3.5 text-primary" />
                          Erişim Şifreleme (PIN)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 text-center sm:text-left">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                              Yeni PIN
                            </span>
                            <InputOTP
                              maxLength={4}
                              value={newPin}
                              onChange={(val) => {
                                setNewPin(val)
                                setPinChangeError(null)
                              }}
                            >
                              <InputOTPGroup className="gap-2 justify-center sm:justify-start">
                                <InputOTPSlot
                                  index={0}
                                  className="rounded-lg border h-11 w-11 text-lg font-bold shadow-sm"
                                />
                                <InputOTPSlot
                                  index={1}
                                  className="rounded-lg border h-11 w-11 text-lg font-bold shadow-sm"
                                />
                                <InputOTPSlot
                                  index={2}
                                  className="rounded-lg border h-11 w-11 text-lg font-bold shadow-sm"
                                />
                                <InputOTPSlot
                                  index={3}
                                  className="rounded-lg border h-11 w-11 text-lg font-bold shadow-sm"
                                />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <div className="space-y-2 text-center sm:text-left">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                              Tekrar Girin
                            </span>
                            <InputOTP
                              maxLength={4}
                              value={confirmPin}
                              onChange={(val) => {
                                setConfirmPin(val)
                                setPinChangeError(null)
                              }}
                            >
                              <InputOTPGroup className="gap-2 justify-center sm:justify-start">
                                <InputOTPSlot
                                  index={0}
                                  className="rounded-lg border h-11 w-11 text-lg font-bold shadow-sm"
                                />
                                <InputOTPSlot
                                  index={1}
                                  className="rounded-lg border h-11 w-11 text-lg font-bold shadow-sm"
                                />
                                <InputOTPSlot
                                  index={2}
                                  className="rounded-lg border h-11 w-11 text-lg font-bold shadow-sm"
                                />
                                <InputOTPSlot
                                  index={3}
                                  className="rounded-lg border h-11 w-11 text-lg font-bold shadow-sm"
                                />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </div>
                        <Button
                          onClick={handleChangePin}
                          disabled={newPin.length !== 4 || confirmPin.length !== 4}
                          className="w-full h-11 text-sm font-bold rounded-lg shadow-sm"
                          variant="secondary"
                        >
                          Güncellemeyi Onayla
                        </Button>
                        <AdminPinModal
                          open={showChangePinModal}
                          onOpenChange={setShowChangePinModal}
                          onSuccess={async () => {
                            try {
                              const clearingPin = newPin === '' && confirmPin === ''
                              if (clearingPin) {
                                await cafeApi.admin.changePin('', '')
                              } else {
                                await cafeApi.admin.changePin('', newPin)
                              }
                              setNewPin('')
                              setConfirmPin('')
                              alert('PIN başarıyla güncellendi')
                              setShowChangePinModal(false)
                            } catch (err) {
                              alert((err as Error).message)
                            }
                          }}
                          title="PIN Değişiklik Onayı"
                          description="İşlemi onaylamak için mevcut yönetici PIN kodunu girin"
                        />
                        {pinChangeError && (
                          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs font-medium text-destructive">
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                            {pinChangeError}
                          </div>
                        )}
                      </div>

                      {/* Recovery Section */}
                      <div className="p-4 bg-muted/20 rounded-xl border border-border/50 space-y-3">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2 ml-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                          Hesap Kurtarma
                        </label>
                        <Select
                          value={selectedQuestionVal}
                          onValueChange={(val) => {
                            setSelectedQuestionVal(val)
                            if (val !== 'custom') setSecurityQuestion(val)
                            else setSecurityQuestion('')
                          }}
                        >
                          <SelectTrigger className="w-full text-sm h-11 bg-background rounded-lg border font-medium">
                            <SelectValue placeholder="Bir kurtarma sorusu belirleyin" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">
                            {PREDEFINED_QUESTIONS.map((q) => (
                              <SelectItem key={q} value={q} className="text-sm py-2.5 font-medium">
                                {q}
                              </SelectItem>
                            ))}
                            <SelectItem
                              value="custom"
                              className="text-sm font-bold py-2.5 border-t"
                            >
                              Kendi sorumu yazacağım...
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {selectedQuestionVal === 'custom' && (
                          <input
                            type="text"
                            placeholder="Güvenlik sorunuzu yazın..."
                            value={securityQuestion}
                            onChange={(e) => setSecurityQuestion(e.target.value)}
                            className="w-full text-sm border rounded-lg px-3 py-2 h-11 bg-background outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                          />
                        )}
                        <input
                          type="text"
                          placeholder="Cevabınızı yazın..."
                          value={securityAnswer}
                          onChange={(e) => setSecurityAnswer(e.target.value)}
                          className="w-full text-sm border rounded-lg px-3 py-2 h-11 bg-background outline-none focus:ring-2 focus:ring-primary/20 font-bold tracking-tight"
                        />
                        <Button
                          className="w-full h-11 text-sm font-bold rounded-lg shadow-sm"
                          onClick={() => setShowRecoveryPinModal(true)}
                          disabled={!securityQuestion || !securityAnswer}
                          variant="outline"
                        >
                          Yöntemi Kaydet
                        </Button>
                        <AdminPinModal
                          open={showRecoveryPinModal}
                          onOpenChange={setShowRecoveryPinModal}
                          onSuccess={async () => {
                            try {
                              await cafeApi.admin.setRecovery('', securityQuestion, securityAnswer)
                              setSecurityAnswer('')
                              setSecurityQuestion('')
                              setSelectedQuestionVal('')
                              setRecoveryError(null)
                              alert('Kurtarma yöntemi başarıyla kaydedildi')
                              setShowRecoveryPinModal(false)
                            } catch (err) {
                              setRecoveryError((err as Error).message)
                            }
                          }}
                          title="Kurtarma Ayarı Onayı"
                          description="Ayarları kaydetmek için yönetici PIN kodunu girin"
                        />
                        {recoveryError && (
                          <div className="text-xs text-destructive p-2 bg-destructive/5 rounded-lg border border-destructive/10">
                            {recoveryError}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: Software Update & System Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch pb-4">
                  {/* Software Update Card */}
                  <Card className="rounded-2xl border bg-card shadow-sm h-full">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
                          <ArrowUpCircle className="w-5 h-5 text-primary" />
                          Yazılım Güncelleme
                        </CardTitle>
                        <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-muted border border-border/50 font-mono tracking-tighter">
                          {appVersion}
                        </span>
                      </div>
                      <CardDescription className="text-sm text-muted-foreground/80 font-medium">
                        Sistem güncelliğini kontrol edin
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 space-y-4">
                      {updateStatus === 'idle' || updateStatus === 'not-available' ? (
                        <div className="flex items-center justify-between p-4 bg-success/5 border border-success/20 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-success/10 rounded-lg">
                              <CheckCircle2 className="w-5 h-5 text-success" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Sistem Güncel</p>
                              <p className="text-xs text-muted-foreground/70">
                                En son sürümü kullanıyorsunuz
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleManualUpdateCheck}
                            className="h-10 text-sm font-bold hover:bg-primary/10 hover:text-primary rounded-lg px-4"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Denetle
                          </Button>
                        </div>
                      ) : updateStatus === 'checking' ? (
                        <div className="flex items-center justify-center gap-4 py-8 bg-muted/10 rounded-xl border border-dashed border-border/50">
                          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                            Kontrol ediliyor...
                          </p>
                        </div>
                      ) : updateStatus === 'available' || updateStatus === 'downloading' ? (
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Download className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Yeni Sürüm Mevcut</p>
                              <p className="text-xs text-primary/70">
                                v{updateInfo?.version || '...'} indiriliyor
                              </p>
                            </div>
                          </div>
                          <div className="h-2.5 w-full bg-primary/10 rounded-full overflow-hidden shadow-inner">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500 shadow-sm"
                              style={{ width: `${downloadProgress}%` }}
                            />
                          </div>
                          <p className="text-sm text-right font-black text-primary tabular-nums tracking-tighter">
                            %{downloadProgress}
                          </p>
                        </div>
                      ) : updateStatus === 'downloaded' ? (
                        <div className="p-4 bg-success/5 border border-success/20 rounded-xl space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-success/10 rounded-lg">
                              <CheckCircle2 className="w-5 h-5 text-success" />
                            </div>
                            <p className="text-sm font-bold text-success uppercase tracking-wider">
                              İndirme Tamamlandı
                            </p>
                          </div>
                          <Button
                            onClick={handleRestartAndInstall}
                            className="w-full h-11 bg-success hover:bg-success/90 text-white text-sm font-bold rounded-lg gap-3 shadow-md active:scale-95 transition-all"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Yeniden Başlat ve Yükle
                          </Button>
                        </div>
                      ) : (
                        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl flex items-center gap-3">
                          <div className="p-2 bg-destructive/10 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-destructive">Hata Oluştu</p>
                            <p className="text-xs text-muted-foreground/70">
                              Güncelleme kontrolü başarısız.
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleManualUpdateCheck}
                            className="h-10 text-sm font-bold text-destructive hover:bg-destructive/10 rounded-lg px-4"
                          >
                            Tekrar Dene
                          </Button>
                        </div>
                      )}
                      <p className="text-[10px] text-center text-muted-foreground/50 leading-relaxed font-medium uppercase tracking-tighter">
                        Güncellemeler otomatik kontrol edilir ve arka planda indirilir.
                      </p>
                    </CardContent>
                  </Card>

                  {/* System Status Card */}
                  <Card className="rounded-2xl border bg-card shadow-sm h-full">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <CardTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Sistem Durumu
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-5 pb-5">
                      <div className="p-4 bg-muted/20 border border-border/50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-background rounded-xl border border-border/50 shadow-sm">
                            <Database className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">Veritabanı</p>
                            <p className="text-xs font-bold text-success flex items-center gap-1.5 uppercase tracking-wider">
                              <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-sm shadow-success/40" />
                              Sağlıklı
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-2xl font-black text-primary tabular-nums leading-none tracking-tighter">
                              {tableCount}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 opacity-60">
                              Masa
                            </p>
                          </div>
                          <div className="w-px h-12 bg-border/80" />
                          <div className="text-right">
                            <p className="text-2xl font-black text-primary tabular-nums leading-none tracking-tighter">
                              {productCount}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 opacity-60">
                              Ürün
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          onClick={() => setShowDemoPinModal(true)}
                          variant="outline"
                          className="h-[4.5rem] flex flex-col gap-2 items-center justify-center rounded-xl text-xs font-bold uppercase tracking-widest border-blue-500/10 hover:bg-blue-50/50 hover:border-blue-500/30 transition-all active:scale-95 shadow-sm"
                        >
                          <RefreshCw className="w-5 h-5 text-blue-500" />
                          Demo Yükle
                        </Button>
                        <Button
                          onClick={async () => {
                            try {
                              await Promise.all([
                                refetchTables(),
                                refetchProducts(),
                                refetchCategories()
                              ])
                              alert('Sistem kontrolü tamamlandı.')
                            } catch (error) {
                              console.error('System check failed:', error)
                              alert('Sistem kontrolü sırasında hata oluştu.')
                            }
                          }}
                          variant="outline"
                          className="h-[4.5rem] flex flex-col gap-2 items-center justify-center rounded-xl text-xs font-bold uppercase tracking-widest border-amber-500/10 hover:bg-amber-50/50 hover:border-amber-500/30 transition-all active:scale-95 shadow-sm"
                        >
                          <Wrench className="w-5 h-5 text-amber-500" />
                          Kontrol Et
                        </Button>
                      </div>

                      <AdminPinModal
                        open={showDemoPinModal}
                        onOpenChange={setShowDemoPinModal}
                        onSuccess={async () => {
                          setShowDemoPinModal(false)
                          setTimeout(async () => {
                            if (
                              confirm(
                                'DİKKAT: Demo verileri yüklendiğinde MEVCUT TÜM VERİLER SİLİNECEKTİR.\n\nDevam etmek istiyor musunuz?'
                              )
                            ) {
                              try {
                                await cafeApi.seed.database()
                                await Promise.all([
                                  refetchTables(),
                                  refetchProducts(),
                                  refetchCategories()
                                ])
                              } catch (error) {
                                console.error('Seed error:', error)
                                alert('Demo veri yükleme başarısız oldu.')
                              }
                            }
                          }, 100)
                        }}
                        title="Demo Verisi Onayı"
                        description="Kritik işlem onayı için PIN girin"
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
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
