import { useState, useEffect } from 'react'
import {
  Sun,
  Moon,
  Lock,
  KeyRound,
  Volume2,
  VolumeX,
  LayoutGrid,
  Tags,
  Coffee,
  Receipt,
  LayoutDashboard,
  History,
  Wrench,
  Settings as SettingsIcon,
  LogOut,
  ArrowLeft,
  ChevronRight,
  Monitor,
  Heart,
  ShieldCheck,
  Database,
  RefreshCw,
  Activity,
  Palette,
  Speaker
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { DashboardView } from '@/features/dashboard/DashboardView'
import { cafeApi } from '@/lib/api'
import { type ColorScheme } from '@/App'
import { TablesTab } from './tabs/TablesTab'
import { CategoriesTab } from './tabs/CategoriesTab'
import { ProductsTab } from './tabs/ProductsTab'
import { LogsTab } from './tabs/LogsTab'
import { MaintenanceTab } from './tabs/MaintenanceTab'
import { ExpensesTab } from './tabs/ExpensesTab'
import { AdminPinModal } from '@/components/ui/AdminPinModal'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTableStore } from '@/store/useTableStore'
import { useInventoryStore } from '@/store/useInventoryStore'
import { cn } from '@/lib/utils'

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
    description: 'Fiyatlar, ürünler ve stok takibi',
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
  const tables = useTableStore((state) => state.tables)
  const fetchTables = useTableStore((state) => state.fetchTables)
  const products = useInventoryStore((state) => state.products)
  const fetchInventory = useInventoryStore((state) => state.fetchInventory)
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
              <p className="mt-2 text-sm text-muted-foreground">
                Yönetici paneli ve sistem yapılandırması
              </p>
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className="group relative flex h-full min-h-[170px] flex-col items-start premium-card ambient-glow p-6 text-left hover:bg-accent/5"
              >
                <div
                  className={cn(
                    'mb-5 rounded-xl bg-muted/50 p-4 transition-all duration-300 group-hover:bg-background shadow-sm',
                    item.color
                  )}
                >
                  <item.icon className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-bold tracking-tight">{item.label}</h3>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground opacity-80">
                  {item.description}
                </p>
                <div className="mt-auto flex w-full justify-end pt-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>

          {/* Footer / Credits */}
          <div className="mt-auto pt-24 pb-12 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 group cursor-default">
              <span className="text-sm font-medium text-muted-foreground/40">Made with</span>
              <div className="relative flex items-center justify-center">
                <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse duration-[2s]" />
                <div className="absolute inset-0 bg-red-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm font-medium text-muted-foreground/40">by</span>
              <span className="text-sm font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent group-hover:to-primary transition-all">
                Baran & Beyda
              </span>
            </div>

            <div className="px-3 py-1 rounded-full bg-muted/20 border border-muted-foreground/5 text-[10px] font-bold text-muted-foreground/30 tracking-widest uppercase">
              Caffio v2.1.0
            </div>
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
            <p className="text-xs text-muted-foreground mt-1 opacity-80">
              {activeItem?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Detail Content */}
      <div
        className={cn(
          'flex-1 bg-background',
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
          {activeView === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
              {/* Left Column: Appearance & Preferences */}
              <div className="space-y-6">
                <Card className="premium-card ambient-glow overflow-hidden">
                  <CardHeader className="bg-muted/10 pb-4 pt-5 px-6">
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      <Palette className="w-5 h-5 text-primary" />
                      Görünüm ve Tercihler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-6 px-6 pb-8">
                    {/* Theme Mode Selection */}
                    <div className="space-y-3">
                      <label className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-tight">
                        <Monitor className="w-3.5 h-3.5" />
                        Tema Modu
                      </label>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => isDark && onThemeToggle()}
                          className={cn(
                            'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 gap-3 shadow-sm',
                            !isDark
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border bg-card hover:bg-accent/50 hover:border-accent'
                          )}
                        >
                          <div className="p-3 rounded-full bg-primary/10 text-primary">
                            <Sun className="w-6 h-6" />
                          </div>
                          <span className={cn('text-sm font-bold', !isDark && 'text-primary')}>
                            Aydınlık
                          </span>
                        </button>

                        <button
                          onClick={() => !isDark && onThemeToggle()}
                          className={cn(
                            'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 gap-3 shadow-sm',
                            isDark
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border bg-card hover:bg-accent/50 hover:border-accent'
                          )}
                        >
                          <div className="p-3 rounded-full bg-slate-800 text-slate-100">
                            <Moon className="w-6 h-6" />
                          </div>
                          <span className={cn('text-sm font-bold', isDark && 'text-primary')}>
                            Karanlık
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-border/50" />

                    {/* Color Scheme */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-tight">
                          <Palette className="w-3.5 h-3.5" />
                          Renk Teması
                        </label>
                        <span className="text-xs font-bold text-primary">
                          {COLOR_SCHEMES.find((c) => c.id === colorScheme)?.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 p-1.5 bg-muted/40 rounded-xl border border-border/50">
                        {COLOR_SCHEMES.map((scheme) => (
                          <button
                            key={scheme.id}
                            onClick={() => onColorSchemeChange(scheme.id)}
                            title={scheme.name}
                            className={cn(
                              'relative group flex items-center justify-center w-full aspect-square rounded-lg transition-all duration-300',
                              'hover:scale-110 active:scale-95',
                              colorScheme === scheme.id
                                ? 'bg-background shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'hover:bg-background/50'
                            )}
                          >
                            <div
                              className="w-8 h-8 rounded-full shadow-sm transition-transform duration-300 group-hover:scale-110"
                              style={{
                                backgroundColor: isDark ? scheme.darkColor : scheme.color
                              }}
                            />
                            {colorScheme === scheme.id && (
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-background rounded-full flex items-center justify-center border border-border/10 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-border/50" />

                    {/* Sound Settings */}
                    <div className="bg-muted/40 rounded-xl p-4 border border-border/50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Speaker className="w-4 h-4 text-muted-foreground" />
                          <span className="font-bold text-sm">Ses Efektleri</span>
                        </div>
                      </div>

                      <Button
                        onClick={toggleSound}
                        variant={soundEnabled ? 'default' : 'secondary'}
                        size="sm"
                        className="rounded-full px-4 font-bold h-8 text-xs"
                      >
                        {soundEnabled ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5 mr-2" /> AÇIK
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-3.5 h-3.5 mr-2" /> KAPALI
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Security & System */}
              <div className="space-y-6">
                {/* Security Card */}
                <Card className="premium-card ambient-glow overflow-hidden">
                  <CardHeader className="bg-muted/10 pb-4 pt-5 px-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base font-bold">
                        <ShieldCheck className="w-5 h-5 text-success" />
                        Güvenlik Merkezi
                      </CardTitle>
                      <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                        GÜVENLİ
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      PIN yönetimi ve güvenlik seçenekleri
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-6 px-6 pb-8">
                    {/* PIN Section */}
                    <div className="space-y-6">
                      <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
                        <label className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-tight">
                          <KeyRound className="w-4 h-4 text-primary" />
                          Erişim Şifreleme (PIN)
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5 flex-1">
                            <span className="text-[10px] font-bold text-muted-foreground/80 ml-1">
                              YENİ PIN
                            </span>
                            <InputOTP
                              maxLength={4}
                              value={newPin}
                              onChange={(val) => {
                                setNewPin(val)
                                setPinChangeError(null)
                              }}
                            >
                              <InputOTPGroup className="gap-2">
                                <InputOTPSlot
                                  index={0}
                                  className="rounded-lg border h-10 w-10 text-sm font-bold shadow-sm bg-background"
                                />
                                <InputOTPSlot
                                  index={1}
                                  className="rounded-lg border h-10 w-10 text-sm font-bold shadow-sm bg-background"
                                />
                                <InputOTPSlot
                                  index={2}
                                  className="rounded-lg border h-10 w-10 text-sm font-bold shadow-sm bg-background"
                                />
                                <InputOTPSlot
                                  index={3}
                                  className="rounded-lg border h-10 w-10 text-sm font-bold shadow-sm bg-background"
                                />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>

                          <div className="space-y-1.5 flex-1">
                            <span className="text-[10px] font-bold text-muted-foreground/80 ml-1">
                              TEKRAR GİRİN
                            </span>
                            <InputOTP
                              maxLength={4}
                              value={confirmPin}
                              onChange={(val) => {
                                setConfirmPin(val)
                                setPinChangeError(null)
                              }}
                            >
                              <InputOTPGroup className="gap-2">
                                <InputOTPSlot
                                  index={0}
                                  className="rounded-lg border h-10 w-10 text-sm font-bold shadow-sm bg-background"
                                />
                                <InputOTPSlot
                                  index={1}
                                  className="rounded-lg border h-10 w-10 text-sm font-bold shadow-sm bg-background"
                                />
                                <InputOTPSlot
                                  index={2}
                                  className="rounded-lg border h-10 w-10 text-sm font-bold shadow-sm bg-background"
                                />
                                <InputOTPSlot
                                  index={3}
                                  className="rounded-lg border h-10 w-10 text-sm font-bold shadow-sm bg-background"
                                />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </div>

                        <Button
                          onClick={handleChangePin}
                          disabled={newPin.length !== 4 || confirmPin.length !== 4}
                          className="w-full h-9 text-xs font-bold"
                          variant="secondary"
                        >
                          GÜNCELLEMEYİ ONAYLA
                        </Button>

                        <AdminPinModal
                          open={showChangePinModal}
                          onOpenChange={setShowChangePinModal}
                          onSuccess={async (verifiedPin) => {
                            try {
                              await cafeApi.admin.changePin(verifiedPin, newPin)
                              setNewPin('')
                              setConfirmPin('')
                              setPinChangeError(null)
                              alert('PIN kodu başarıyla değiştirildi.')
                              setShowChangePinModal(false)
                            } catch (err) {
                              setPinChangeError(err instanceof Error ? err.message : 'Hata oluştu')
                            }
                          }}
                          title="Güvenlik Doğrulaması"
                          description="Mevcut PIN kodunuzu girin"
                        />
                      </div>

                      {pinChangeError && (
                        <div className="mt-4 flex animate-in fade-in slide-in-from-top-1 items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-bold text-destructive">
                          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                          {pinChangeError}
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-border/50" />

                    {/* Recovery Section */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
                      <label className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-tight">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Hesap Kurtarma Ayarları
                      </label>

                      <div className="space-y-3">
                        <Select
                          value={selectedQuestionVal}
                          onValueChange={(val) => {
                            setSelectedQuestionVal(val)
                            if (val !== 'custom') setSecurityQuestion(val)
                            else setSecurityQuestion('')
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs font-medium bg-background">
                            <SelectValue placeholder="Bir kurtarma sorusu belirleyin" />
                          </SelectTrigger>
                          <SelectContent>
                            {PREDEFINED_QUESTIONS.map((q) => (
                              <SelectItem key={q} value={q} className="text-xs">
                                {q}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom" className="text-xs">
                              Kendi sorumu yazacağım...
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {selectedQuestionVal === 'custom' && (
                          <div className="animate-in slide-in-from-top-2 duration-300">
                            <span className="text-[10px] font-bold text-muted-foreground/80 ml-1 mb-1 block">
                              ÖZEL GÜVENLİK SORUNUZ
                            </span>
                            <input
                              type="text"
                              placeholder="Örn: İlk evcil hayvanımın cinsi nedir?"
                              value={securityQuestion}
                              onChange={(e) => setSecurityQuestion(e.target.value)}
                              className="w-full text-xs border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/10 outline-none transition-all h-9"
                            />
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground/80 ml-1 mb-1 block">
                            CEVAP
                          </span>
                          <input
                            type="text"
                            placeholder="Cevabınızı buraya yazın..."
                            value={securityAnswer}
                            onChange={(e) => setSecurityAnswer(e.target.value)}
                            className="w-full text-xs border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/10 outline-none h-9 transition-all"
                          />
                        </div>

                        <Button
                          className="w-full h-9 text-xs font-bold"
                          onClick={() => setShowRecoveryPinModal(true)}
                          disabled={!securityQuestion || !securityAnswer}
                          variant="outline"
                        >
                          YÖNTEMİ KAYDET
                        </Button>

                        <AdminPinModal
                          open={showRecoveryPinModal}
                          onOpenChange={setShowRecoveryPinModal}
                          onSuccess={async (verifiedPin) => {
                            try {
                              await cafeApi.admin.setRecovery(
                                verifiedPin,
                                securityQuestion,
                                securityAnswer
                              )
                              setRecoveryError(null)
                              alert('Kurtarma yöntemi başarıyla kaydedildi.')
                              setShowRecoveryPinModal(false)
                            } catch {
                              setRecoveryError('Kaydedilemedi')
                              setShowRecoveryPinModal(false)
                            }
                          }}
                          title="Onay Gerekiyor"
                          description="Değişiklikleri kaydetmek için PIN girin"
                        />

                        {recoveryError && (
                          <div className="mt-2 text-center text-xs font-bold text-destructive p-2 bg-destructive/5 rounded-lg border border-destructive/10">
                            {recoveryError}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* System Actions */}
                <Card className="premium-card ambient-glow overflow-hidden">
                  <CardHeader className="bg-muted/10 pb-4 pt-5 px-6">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-500" />
                      Sistem Durumu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 pt-6 px-6 pb-8">
                    <div className="col-span-2 p-3 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-between shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-background rounded-md border border-primary/20 shadow-sm">
                          <Database className="w-4 h-4 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-sm">Veritabanı</p>
                          <p className="text-[10px] font-bold text-success flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                            GÜNCEL
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold tracking-tight text-primary">
                            {tables.length}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                            Masa
                          </p>
                        </div>
                        <div className="w-px h-6 bg-border/80" />
                        <div className="text-right">
                          <p className="text-lg font-bold tracking-tight text-primary">
                            {products.length}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                            Ürün
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => setShowDemoPinModal(true)}
                      variant="outline"
                      className="w-full h-auto py-3 flex flex-col gap-1.5 items-center justify-center rounded-xl border hover:bg-muted font-bold transition-all"
                    >
                      <RefreshCw className="w-4 h-4 text-blue-500" />
                      <span className="text-xs">DEMO YÜKLE</span>
                    </Button>

                    <Button
                      onClick={async () => {
                        try {
                          await Promise.all([fetchTables(), fetchInventory(true)])
                          alert(
                            'Sistem kontrolü tamamlandı: Veritabanı bağlantısı sağlıklı ve tüm veriler güncel.'
                          )
                        } catch (error) {
                          console.error('System check failed:', error)
                          alert(
                            'Sistem kontrolü sırasında bir hata oluştu. Lütfen bağlantıyı kontrol edin.'
                          )
                        }
                      }}
                      variant="outline"
                      className="w-full h-auto py-3 flex flex-col gap-1.5 items-center justify-center rounded-xl border hover:bg-muted font-bold transition-all"
                    >
                      <Wrench className="w-4 h-4 text-amber-500" />
                      <span className="text-xs">KONTROL ET</span>
                    </Button>

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
                              await Promise.all([fetchTables(), fetchInventory(true)])
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
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <TablesTab />
            </div>
          )}

          {activeView === 'categories' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <CategoriesTab />
            </div>
          )}

          {activeView === 'products' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <ProductsTab />
            </div>
          )}

          {activeView === 'expenses' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <ExpensesTab />
            </div>
          )}

          {activeView === 'dashboard' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 h-full">
              <DashboardView />
            </div>
          )}

          {activeView === 'logs' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <LogsTab />
            </div>
          )}

          {activeView === 'maintenance' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <MaintenanceTab />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
