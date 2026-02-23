// src/renderer/pages/settings/GeneralSettingsTab.tsx
import { AdminPinModal } from '@/components/ui/AdminPinModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  ArrowUpCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Moon,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  Wrench
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PinInput } from '../components/PinInput'
import { SettingRow } from '../components/SettingRow'
import { UpdateStatusArea } from '../components/UpdateStatusArea'

const COLOR_SCHEMES: { id: ColorScheme; name: string; color: string; darkColor: string }[] = [
  { id: 'sage', name: 'Sage', color: 'oklch(0.55 0.12 165)', darkColor: 'oklch(0.7 0.1 165)' },
  { id: 'nordic', name: 'Nordic', color: 'oklch(0.45 0.1 230)', darkColor: 'oklch(0.65 0.08 230)' },
  { id: 'violet', name: 'Violet', color: 'oklch(0.5 0.22 290)', darkColor: 'oklch(0.68 0.18 290)' },
  { id: 'canyon', name: 'Canyon', color: 'oklch(0.6 0.14 55)', darkColor: 'oklch(0.72 0.12 55)' },
  { id: 'rose', name: 'Rose', color: 'oklch(0.55 0.16 350)', darkColor: 'oklch(0.7 0.12 350)' }
]

const PREDEFINED_QUESTIONS = [
  'İlk evcil hayvanınızın adı?',
  'Annenizin kızlık soyadı?',
  'İlk gittiğiniz okulun adı?',
  'En sevdiğiniz yemek?',
  'Doğduğunuz şehir?'
]

interface GeneralSettingsTabProps {
  isDark: boolean
  onThemeToggle: () => void
  colorScheme: ColorScheme
  onColorSchemeChange: (scheme: ColorScheme) => void
  activeView: string | null
}

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

const ui = {
  container: 'w-full h-full overflow-y-auto px-4 xl:px-6 pt-4 pb-8',
  vspace: 'space-y-4',
  card: cn(
    'rounded-2xl overflow-hidden border',
    'border-zinc-200/70 dark:border-zinc-800/80',
    'bg-white/90 dark:bg-zinc-900/85',
    'backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:shadow-none'
  ),
  header: cn(
    'px-5 py-4 border-b',
    'border-zinc-200/70 dark:border-zinc-800/70',
    'bg-gradient-to-b from-zinc-50/90 to-white/80 dark:from-zinc-900/70 dark:to-zinc-900/30'
  ),
  kicker: 'text-[13px] font-semibold tracking-tight',
  meta: 'text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5',
  summaryIconBox:
    'w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-200/70 dark:border-zinc-700/70 shrink-0',
  summaryTitle: 'text-[14px] font-semibold text-foreground truncate leading-tight',
  summaryKicker:
    'text-[10px] uppercase tracking-[0.12em] font-semibold text-zinc-500 dark:text-zinc-400',
  controlHeight: 'h-10',
  controlText: 'text-sm font-medium',
  softCard: cn(
    'rounded-2xl overflow-hidden border',
    'border-zinc-200/70 dark:border-zinc-800/80',
    'bg-zinc-50/70 dark:bg-zinc-950/20'
  ),
  subHeader: cn(
    'px-4 py-3 border-b flex items-center gap-2',
    'border-zinc-200/60 dark:border-zinc-800/70',
    'bg-white/70 dark:bg-zinc-900/30'
  ),
  subKicker: 'text-[11px] font-semibold tracking-wide text-zinc-600 dark:text-zinc-400',
  btnPrimary: 'h-10 rounded-xl text-sm font-semibold',
  btnOutline: 'h-10 rounded-xl text-sm font-semibold border'
} as const

function SummaryCard(props: {
  icon: React.ReactNode
  kicker: string
  title: string
  iconClassName?: string
  titleClassName?: string
}): React.JSX.Element {
  return (
    <Card
      className={cn(
        'rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80',
        'bg-white/85 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm',
        'transition-all duration-200 hover:shadow-md motion-safe:hover:-translate-y-[1px]'
      )}
    >
      <div className="p-3.5 flex items-center gap-3">
        <div className={cn(ui.summaryIconBox, props.iconClassName)}>{props.icon}</div>

        <div className="min-w-0">
          <p className={ui.summaryKicker}>{props.kicker}</p>
          <p className={cn(ui.summaryTitle, props.titleClassName)}>{props.title}</p>
        </div>
      </div>
    </Card>
  )
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

  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinChangeError, setPinChangeError] = useState<string | null>(null)

  const [securityQuestion, setSecurityQuestion] = useState('')
  const [selectedQuestionVal, setSelectedQuestionVal] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [showRecoveryPinModal, setShowRecoveryPinModal] = useState(false)

  const [showDemoPinModal, setShowDemoPinModal] = useState(false)
  const [showSeedConfirmDialog, setShowSeedConfirmDialog] = useState(false)

  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [appVersion, setAppVersion] = useState<string>('...')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [isCheckingSystem, setIsCheckingSystem] = useState(false)
  const [isChangingPin, setIsChangingPin] = useState(false)
  const [isSavingRecovery, setIsSavingRecovery] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  const selectedSchemeName = useMemo(
    () => COLOR_SCHEMES.find((c) => c.id === colorScheme)?.name ?? '',
    [colorScheme]
  )

  const canSubmitPin = useMemo(
    () => newPin.length === 4 && confirmPin.length === 4,
    [newPin, confirmPin]
  )

  const canSaveRecovery = useMemo(
    () => securityQuestion.trim().length > 0 && securityAnswer.trim().length > 0,
    [securityAnswer, securityQuestion]
  )

  useEffect(() => {
    let mounted = true
    window.api.system
      .getVersion()
      .then((v) => {
        if (mounted) setAppVersion(`v${v}`)
      })
      .catch(() => {
        if (mounted) setAppVersion('v1.0.0')
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (activeView !== 'general') return

    const unsubscribe = cafeApi.system.onUpdate((event, data: unknown) => {
      switch (event) {
        case 'checking':
          setUpdateStatus('checking')
          toast.loading('Güncellemeler kontrol ediliyor...', { id: 'update-check' })
          break
        case 'available':
          setUpdateStatus('available')
          setUpdateInfo(data as UpdateInfo)
          toast.success('Yeni sürüm bulundu', {
            id: 'update-check',
            description: `v${(data as UpdateInfo)?.version ?? ''} indirilmeye hazır`
          })
          break
        case 'not-available':
          setUpdateStatus('not-available')
          toast.success('Sistem güncel', {
            id: 'update-check',
            description: 'Yeni sürüm bulunamadı'
          })
          break
        case 'progress':
          setUpdateStatus('downloading')
          setDownloadProgress((data as { percent: number })?.percent || 0)
          break
        case 'downloaded':
          setUpdateStatus('downloaded')
          setUpdateInfo(data as UpdateInfo)
          toast.success('Güncelleme indirildi', {
            id: 'update-check',
            description: 'Yeniden başlatıp yükleyebilirsiniz'
          })
          break
        case 'error':
          setUpdateStatus('error')
          toast.error('Güncelleme hatası', { id: 'update-check' })
          break
      }
    })

    return () => {
      const cleanup = unsubscribe as unknown as () => void
      if (typeof cleanup === 'function') cleanup()
    }
  }, [activeView])

  const handleManualUpdateCheck = useCallback(async (): Promise<void> => {
    setUpdateStatus('checking')
    setIsCheckingUpdate(true)
    try {
      const result = await cafeApi.system.checkUpdate()
      if (!result.available) {
        setUpdateStatus('not-available')
        toast.success('Güncelleme kontrolü tamamlandı', {
          description: 'Yeni sürüm bulunamadı.'
        })
      }
    } catch {
      setUpdateStatus('error')
      toast.error('Güncelleme kontrolü başarısız')
    } finally {
      setIsCheckingUpdate(false)
    }
  }, [])

  const handleThemeLight = useCallback(() => {
    if (isDark) onThemeToggle()
  }, [isDark, onThemeToggle])

  const handleThemeDark = useCallback(() => {
    if (!isDark) onThemeToggle()
  }, [isDark, onThemeToggle])

  const handleChangePin = useCallback((): void => {
    if (newPin !== '' && (newPin.length !== 4 || newPin !== confirmPin)) {
      setPinChangeError(newPin !== confirmPin ? 'PIN kodları eşleşmiyor' : 'PIN 4 haneli olmalıdır')
      return
    }
    setShowChangePinModal(true)
  }, [confirmPin, newPin])

  const handleSystemCheck = useCallback(async () => {
    setIsCheckingSystem(true)
    const loadingId = toast.loading('Sistem kontrolü başlatıldı...')
    try {
      await Promise.all([refetchTables(), refetchProducts(), refetchCategories()])
      toast.success('Sistem kontrolü tamamlandı', { id: loadingId })
    } catch {
      toast.error('Sistem kontrolü sırasında hata oluştu', { id: loadingId })
    } finally {
      setIsCheckingSystem(false)
    }
  }, [refetchCategories, refetchProducts, refetchTables])

  const handleDemoLoad = useCallback(() => {
    setShowDemoPinModal(true)
  }, [])

  const handleSeedDatabase = useCallback(async () => {
    setIsSeeding(true)
    try {
      await cafeApi.seed.database()
      await Promise.all([refetchTables(), refetchProducts(), refetchCategories()])
      setShowSeedConfirmDialog(false)
      toast.success('Demo verisi yüklendi')
    } catch {
      toast.error('Demo yükleme başarısız')
    } finally {
      setIsSeeding(false)
    }
  }, [refetchCategories, refetchProducts, refetchTables])

  return (
    <div className={cn(ui.container, ui.vspace)}>
      {/* ÜST ÖZET */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Palette className="w-4 h-4" />}
          kicker="Tema"
          title={`${isDark ? 'Karanlık' : 'Aydınlık'} · ${selectedSchemeName}`}
          iconClassName="bg-primary/10 text-primary"
        />

        <SummaryCard
          icon={soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          kicker="Ses"
          title={soundEnabled ? 'Açık' : 'Kapalı'}
          iconClassName={
            soundEnabled
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
          }
        />

        <SummaryCard
          icon={<ArrowUpCircle className="w-4 h-4" />}
          kicker="Sürüm"
          title={appVersion}
          iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />

        <SummaryCard
          icon={<ShieldCheck className="w-4 h-4" />}
          kicker="Güvenlik"
          title="Aktif"
          titleClassName="text-emerald-600 dark:text-emerald-400"
          iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* ANA GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-4 items-start">
        {/* SOL */}
        <div className="space-y-4">
          {/* GÖRÜNÜM */}
          <Card className={ui.card}>
            <div className={ui.header}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className={cn(ui.kicker, 'text-foreground')}>Görünüm</span>
              </div>
              <p className={ui.meta}>Tema, renk ve ses ayarlarını düzenleyin</p>
            </div>

            <div className="p-4">
              <SettingRow label="Tema Modu">
                <div className="inline-flex rounded-xl border border-zinc-200/70 dark:border-zinc-700/70 bg-zinc-100/70 dark:bg-zinc-800/50 p-1 gap-1">
                  <button
                    type="button"
                    onClick={handleThemeLight}
                    className={cn(
                      'h-9 px-3 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                      !isDark
                        ? 'bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-200/70 dark:ring-zinc-700/70 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/70 dark:hover:bg-zinc-900/60'
                    )}
                  >
                    <Sun className="w-4 h-4" />
                    Aydınlık
                  </button>

                  <button
                    type="button"
                    onClick={handleThemeDark}
                    className={cn(
                      'h-9 px-3 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                      isDark
                        ? 'bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-200/70 dark:ring-zinc-700/70 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/70 dark:hover:bg-zinc-900/60'
                    )}
                  >
                    <Moon className="w-4 h-4" />
                    Karanlık
                  </button>
                </div>
              </SettingRow>

              <SettingRow label="Renk Teması">
                <div className="w-full rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/20 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {COLOR_SCHEMES.map((scheme) => {
                        const selected = colorScheme === scheme.id
                        return (
                          <button
                            key={scheme.id}
                            type="button"
                            onClick={() => onColorSchemeChange(scheme.id)}
                            title={scheme.name}
                            className={cn(
                              'relative w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                              selected
                                ? 'bg-white dark:bg-zinc-900 ring-1 ring-zinc-300/70 dark:ring-zinc-700 shadow-sm'
                                : 'hover:bg-white/70 dark:hover:bg-zinc-900/50'
                            )}
                          >
                            <span
                              className={cn(
                                'block w-4.5 h-4.5 rounded-full transition-transform',
                                selected ? 'scale-110' : ''
                              )}
                              style={{
                                backgroundColor: isDark ? scheme.darkColor : scheme.color
                              }}
                            />
                          </button>
                        )
                      })}
                    </div>

                    <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/15">
                      {selectedSchemeName}
                    </span>
                  </div>
                </div>
              </SettingRow>

              <SettingRow label="Ses Efektleri" description="Bildirim ve etkileşim sesleri" last>
                <button
                  type="button"
                  onClick={toggleSound}
                  className={cn(
                    'h-10 px-3 rounded-xl border text-sm font-medium inline-flex items-center gap-2 transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                    soundEnabled
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-zinc-100/70 dark:bg-zinc-800/50 text-muted-foreground border-zinc-200/70 dark:border-zinc-700/70 hover:text-foreground'
                  )}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {soundEnabled ? 'Açık' : 'Kapalı'}
                </button>
              </SettingRow>
            </div>
          </Card>

          {/* GÜNCELLEME */}
          <Card className={ui.card}>
            <div className={cn(ui.header, 'flex items-center justify-between gap-3')}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="w-4 h-4 text-blue-500" />
                  <span className={cn(ui.kicker, 'text-foreground')}>Yazılım Güncelleme</span>
                </div>
                <p className={ui.meta}>Uygulama sürümünü kontrol edin</p>
              </div>

              <span
                className={cn(
                  'shrink-0 text-xs font-medium font-mono rounded-lg border px-2 py-1',
                  'border-zinc-200/70 dark:border-zinc-700/70 bg-zinc-100/70 dark:bg-zinc-800/50',
                  appVersion === '...' && 'animate-pulse'
                )}
              >
                {appVersion}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <UpdateStatusArea
                status={updateStatus}
                progress={downloadProgress}
                info={updateInfo}
                onCheck={handleManualUpdateCheck}
              />

              {isCheckingUpdate && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Güncelleme kontrol ediliyor…
                </div>
              )}
            </div>
          </Card>

          {/* SİSTEM DURUMU */}
          <Card className={ui.card}>
            <div className={ui.header}>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                <span className={cn(ui.kicker, 'text-foreground')}>Sistem Durumu</span>
              </div>
              <p className={ui.meta}>Veritabanı ve veri erişim kontrolü</p>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/20 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className={ui.summaryKicker}>Veritabanı</p>
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Sağlıklı
                    </span>
                  </div>
                  <p className="text-xl font-semibold mt-1.5 leading-none">{tables.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Masa</p>
                </div>

                <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/20 p-3.5">
                  <p className={ui.summaryKicker}>Envanter</p>
                  <p className="text-xl font-semibold mt-1.5 leading-none">{products.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ürün</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDemoLoad}
                  disabled={isSeeding}
                  className={cn(
                    'h-10 rounded-xl border text-sm font-medium transition-all inline-flex items-center justify-center gap-2',
                    'border-blue-200/70 dark:border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400',
                    'disabled:opacity-60 disabled:pointer-events-none'
                  )}
                >
                  {isSeeding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Demo Yükle
                </button>

                <button
                  type="button"
                  onClick={handleSystemCheck}
                  disabled={isCheckingSystem}
                  className={cn(
                    'h-10 rounded-xl border text-sm font-medium transition-all inline-flex items-center justify-center gap-2',
                    'border-amber-200/80 dark:border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400',
                    'disabled:opacity-60 disabled:pointer-events-none'
                  )}
                >
                  {isCheckingSystem ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wrench className="w-4 h-4" />
                  )}
                  Kontrol Et
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* SAĞ */}
        <div className="space-y-4 xl:sticky xl:top-4 self-start">
          <Card className={ui.card}>
            <div className={cn(ui.header, 'flex items-center justify-between gap-2')}>
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className={cn(ui.kicker, 'text-foreground')}>Güvenlik</span>
                </div>
                <p className={ui.meta}>PIN ve kurtarma yöntemi yönetimi</p>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Güvenli
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* PIN BLOK */}
              <div className={ui.softCard}>
                <div className={ui.subHeader}>
                  <KeyRound className="w-4 h-4 text-primary" />
                  <span className={ui.subKicker}>Yönetici PIN</span>
                </div>

                <div className="p-4 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PinInput
                      label="YENİ PIN"
                      value={newPin}
                      onChange={(v) => {
                        setNewPin(v)
                        setPinChangeError(null)
                      }}
                    />
                    <PinInput
                      label="TEKRAR"
                      value={confirmPin}
                      onChange={(v) => {
                        setConfirmPin(v)
                        setPinChangeError(null)
                      }}
                    />
                  </div>

                  {pinChangeError && (
                    <p className="text-xs font-medium text-rose-500">{pinChangeError}</p>
                  )}

                  <Button
                    onClick={handleChangePin}
                    disabled={!canSubmitPin || isChangingPin}
                    className={cn('w-full', ui.btnPrimary)}
                  >
                    {isChangingPin && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    PIN Güncelle
                  </Button>
                </div>
              </div>

              {/* KURTARMA BLOK */}
              <div className={ui.softCard}>
                <div className={ui.subHeader}>
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className={ui.subKicker}>Hesap Kurtarma</span>
                </div>

                <div className="p-4 space-y-3">
                  <Select
                    value={selectedQuestionVal}
                    onValueChange={(val) => {
                      setSelectedQuestionVal(val)
                      setSecurityQuestion(val !== 'custom' ? val : '')
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        'w-full rounded-xl border-zinc-200/70 dark:border-zinc-700/70 bg-white/80 dark:bg-zinc-900/70 px-3',
                        ui.controlHeight,
                        ui.controlText
                      )}
                    >
                      <SelectValue placeholder="Güvenlik sorusu seçin" />
                    </SelectTrigger>

                    <SelectContent className="rounded-xl border-zinc-200/70 dark:border-zinc-700/70 shadow-xl">
                      {PREDEFINED_QUESTIONS.map((q) => (
                        <SelectItem key={q} value={q} className="text-sm py-2.5">
                          {q}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="custom"
                        className="text-sm py-2.5 text-primary border-t border-zinc-200/70 dark:border-zinc-700/70 mt-1"
                      >
                        Kendi sorumu yazacağım…
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedQuestionVal === 'custom' && (
                    <Input
                      value={securityQuestion}
                      onChange={(e) => setSecurityQuestion(e.target.value)}
                      placeholder="Sorunuzu yazın"
                      className={cn(
                        'rounded-xl bg-white/80 dark:bg-zinc-900/70 border-zinc-200/70 dark:border-zinc-700/70 px-3',
                        ui.controlHeight,
                        ui.controlText
                      )}
                    />
                  )}

                  <Input
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Cevabınızı yazın"
                    className={cn(
                      'rounded-xl bg-white/80 dark:bg-zinc-900/70 border-zinc-200/70 dark:border-zinc-700/70 px-3',
                      ui.controlHeight,
                      ui.controlText
                    )}
                  />

                  <Button
                    onClick={() => setShowRecoveryPinModal(true)}
                    disabled={!canSaveRecovery || isSavingRecovery}
                    variant="outline"
                    className={cn('w-full', ui.btnOutline)}
                  >
                    {isSavingRecovery && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    Yöntemi Kaydet
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* MODALLAR */}
      <AdminPinModal
        open={showChangePinModal}
        onOpenChange={setShowChangePinModal}
        title="PIN Onayı"
        description="Mevcut yönetici şifresini girin"
        onSuccess={async () => {
          try {
            setIsChangingPin(true)
            await cafeApi.admin.changePin('', newPin)
            setNewPin('')
            setConfirmPin('')
            setShowChangePinModal(false)
            toast.success('PIN güncellendi')
          } catch {
            toast.error('PIN güncellenemedi')
          } finally {
            setIsChangingPin(false)
          }
        }}
      />

      <AdminPinModal
        open={showRecoveryPinModal}
        onOpenChange={setShowRecoveryPinModal}
        title="Güvenlik Onayı"
        description="İşlemi onaylamak için PIN girin"
        onSuccess={async () => {
          try {
            setIsSavingRecovery(true)
            await cafeApi.admin.setRecovery('', securityQuestion.trim(), securityAnswer.trim())
            setSecurityAnswer('')
            setSecurityQuestion('')
            setSelectedQuestionVal('')
            setShowRecoveryPinModal(false)
            toast.success('Kurtarma yöntemi kaydedildi')
          } catch {
            toast.error('Yöntem kaydedilemedi')
          } finally {
            setIsSavingRecovery(false)
          }
        }}
      />

      <AdminPinModal
        open={showDemoPinModal}
        onOpenChange={setShowDemoPinModal}
        title="Kritik İşlem"
        description="Demo yüklemek için PIN girin"
        onSuccess={async () => {
          setShowDemoPinModal(false)
          setShowSeedConfirmDialog(true)
        }}
      />

      {/* Demo confirm yerine native confirm yok */}
      <AlertDialog open={showSeedConfirmDialog} onOpenChange={setShowSeedConfirmDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Demo verisi yüklensin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem mevcut tüm verileri siler ve demo verisini yükler. İşlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Vazgeç</AlertDialogCancel>

            <AlertDialogAction asChild>
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  void handleSeedDatabase()
                }}
                disabled={isSeeding}
                variant="destructive"
                className="rounded-xl"
              >
                {isSeeding && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Evet, Yükle
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
