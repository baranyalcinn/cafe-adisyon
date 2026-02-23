// src/renderer/pages/settings/GeneralSettingsTab.tsx
import { AdminPinModal } from '@/components/ui/AdminPinModal'
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

import { PinInput } from '../components/PinInput'
import { SettingRow } from '../components/SettingRow'
import { UpdateStatusArea } from '../components/UpdateStatusArea'

const COLOR_SCHEMES: { id: ColorScheme; name: string; color: string; darkColor: string }[] = [
  { id: 'emerald', name: 'Sage', color: 'oklch(0.55 0.12 165)', darkColor: 'oklch(0.7 0.1 165)' },
  { id: 'ocean', name: 'Nordic', color: 'oklch(0.45 0.1 230)', darkColor: 'oklch(0.65 0.08 230)' },
  { id: 'violet', name: 'Violet', color: 'oklch(0.5 0.22 290)', darkColor: 'oklch(0.68 0.18 290)' },
  { id: 'amber', name: 'Canyon', color: 'oklch(0.6 0.14 55)', darkColor: 'oklch(0.72 0.12 55)' },
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
  container: 'w-full h-full overflow-y-auto px-4 xl:px-8 pt-6 pb-10',
  vspace: 'space-y-6 pb-12',
  card: 'rounded-2xl border-2 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden',
  header: 'px-6 py-5 border-b-2 bg-zinc-50 dark:bg-zinc-950/50',
  kicker: 'text-[13px] font-black tracking-tight',
  meta: 'text-[13px] font-bold text-zinc-500 italic',
  label: 'text-base font-black tracking-tight',
  summaryIconBox: 'w-12 h-12 rounded-xl flex items-center justify-center border-2',
  summaryTitle: 'text-base font-black truncate leading-tight',
  summaryKicker: 'text-[11px] tracking-widest font-black text-zinc-400',
  controlHeight: 'h-12',
  controlText: 'text-sm font-bold',
  softCard:
    'rounded-2xl border-2 border-border/60 bg-zinc-50/50 dark:bg-zinc-950/20 overflow-hidden',
  subHeader:
    'px-6 py-4 border-b-2 border-border/40 flex items-center gap-2 bg-white/50 dark:bg-black/20',
  subKicker: 'text-[11px] font-black tracking-widest text-zinc-500',
  btnPrimary: 'h-12 rounded-xl text-sm font-black tracking-tight',
  btnOutline: 'h-12 rounded-xl text-sm font-black tracking-tight border-2'
} as const

function SummaryCard(props: {
  icon: React.ReactNode
  kicker: string
  title: string
  iconClassName?: string
  titleClassName?: string
}): React.JSX.Element {
  return (
    <Card className="rounded-2xl border-2 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:shadow-md">
      <div className="p-5 flex items-center gap-5">
        <div className={cn(ui.summaryIconBox, 'border-current', props.iconClassName)}>
          {props.icon}
        </div>
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

  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [appVersion, setAppVersion] = useState<string>('...')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const selectedSchemeName = useMemo(
    () => COLOR_SCHEMES.find((c) => c.id === colorScheme)?.name ?? '',
    [colorScheme]
  )

  const canSubmitPin = useMemo(
    () => newPin.length === 4 && confirmPin.length === 4,
    [newPin, confirmPin]
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
      const cleanup = unsubscribe as unknown as () => void
      if (typeof cleanup === 'function') cleanup()
    }
  }, [activeView])

  const handleManualUpdateCheck = useCallback(async (): Promise<void> => {
    setUpdateStatus('checking')
    try {
      const result = await cafeApi.system.checkUpdate()
      if (!result.available) setUpdateStatus('not-available')
    } catch {
      setUpdateStatus('error')
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
    try {
      await Promise.all([refetchTables(), refetchProducts(), refetchCategories()])
      alert('Sistem kontrolü tamamlandı.')
    } catch {
      alert('Sistem kontrolü sırasında hata oluştu.')
    }
  }, [refetchCategories, refetchProducts, refetchTables])

  const handleDemoLoad = useCallback(() => {
    setShowDemoPinModal(true)
  }, [])

  return (
    <div className={cn(ui.container, ui.vspace)}>
      {/* ===== ÜST ÖZET STRIP ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Palette className="w-[18px] h-[18px]" />}
          kicker="Tema"
          title={`${isDark ? 'Karanlık' : 'Aydınlık'} · ${selectedSchemeName}`}
          iconClassName="bg-primary/10 text-primary"
        />

        <SummaryCard
          icon={
            soundEnabled ? (
              <Volume2 className="w-[18px] h-[18px]" />
            ) : (
              <VolumeX className="w-[18px] h-[18px]" />
            )
          }
          kicker="Ses"
          title={soundEnabled ? 'Açık' : 'Kapalı'}
          iconClassName={
            soundEnabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
          }
        />

        <SummaryCard
          icon={<ArrowUpCircle className="w-[18px] h-[18px]" />}
          kicker="Sürüm"
          title={appVersion}
          iconClassName="bg-blue-500/10 text-blue-600"
        />

        <SummaryCard
          icon={<ShieldCheck className="w-[18px] h-[18px]" />}
          kicker="Güvenlik"
          title="Aktif"
          titleClassName="text-emerald-600"
          iconClassName="bg-emerald-500/10 text-emerald-600"
        />
      </div>

      {/* ===== ANA GRID ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5 xl:min-h-[calc(100vh-220px)] items-stretch">
        {/* SOL KOLON */}
        <div className="space-y-5 h-full">
          {/* GÖRÜNÜM KARTI */}
          <Card className={cn(ui.card, 'h-fit')}>
            <div className={ui.header}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className={cn(ui.kicker, 'text-foreground')}>Görünüm</span>
              </div>
              <p className={cn(ui.meta, 'mt-1')}>Tema, renk ve ses ayarlarını özelleştir</p>
            </div>

            <div className="p-4">
              <SettingRow label="Tema Modu">
                <div className="flex bg-muted/60 rounded-xl p-1.5 gap-1.5 border border-border/20">
                  <button
                    type="button"
                    onClick={handleThemeLight}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all',
                      !isDark
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    )}
                  >
                    <Sun className="w-4 h-4" />
                    Aydınlık
                  </button>
                  <button
                    type="button"
                    onClick={handleThemeDark}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all',
                      isDark
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    )}
                  >
                    <Moon className="w-4 h-4" />
                    Karanlık
                  </button>
                </div>
              </SettingRow>

              <SettingRow label="Renk Teması">
                <div className="w-full rounded-xl border border-border/20 bg-muted/35 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {COLOR_SCHEMES.map((scheme) => (
                        <button
                          key={scheme.id}
                          type="button"
                          onClick={() => onColorSchemeChange(scheme.id)}
                          title={scheme.name}
                          className={cn(
                            'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                            colorScheme === scheme.id
                              ? 'bg-background shadow-sm ring-2 ring-primary/30 scale-[1.03]'
                              : 'hover:bg-background/60'
                          )}
                        >
                          <div
                            className="w-5 h-5 rounded-full"
                            style={{ backgroundColor: isDark ? scheme.darkColor : scheme.color }}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
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
                    'flex items-center gap-2.5 px-4 h-11 rounded-xl text-sm font-bold border transition-all',
                    soundEnabled
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted text-muted-foreground border-border/30 hover:bg-muted/80'
                  )}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {soundEnabled ? 'Ses Açık' : 'Ses Kapalı'}
                </button>
              </SettingRow>
            </div>
          </Card>

          {/* GÜNCELLEME KARTI */}
          <Card className={cn(ui.card, 'h-fit')}>
            <div className={cn(ui.header, 'flex items-center justify-between')}>
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-blue-500" />
                <span className={cn(ui.kicker, 'text-foreground')}>Yazılım Güncelleme</span>
              </div>
              <span className="text-sm font-bold font-mono rounded-lg border border-border/30 bg-muted/40 px-2.5 py-1.5">
                {appVersion}
              </span>
            </div>

            <div className="p-5">
              <UpdateStatusArea
                status={updateStatus}
                progress={downloadProgress}
                info={updateInfo}
                onCheck={handleManualUpdateCheck}
              />
            </div>
          </Card>

          {/* SİSTEM DURUMU */}
          <Card className={cn(ui.card, 'h-fit')}>
            <div className={ui.header}>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                <span className={cn(ui.kicker, 'text-foreground')}>Sistem Durumu</span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <p className={ui.summaryKicker}>Veritabanı</p>
                    <span className="inline-flex items-center gap-2 text-emerald-600 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Sağlıklı
                    </span>
                  </div>
                  <p className="text-2xl font-black mt-2">{tables.length}</p>
                  <p className="text-[13px] font-semibold text-muted-foreground">Masa</p>
                </div>

                <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
                  <p className={ui.summaryKicker}>Envanter</p>
                  <p className="text-2xl font-black mt-2">{products.length}</p>
                  <p className="text-[13px] font-semibold text-muted-foreground">Ürün</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleDemoLoad}
                  className="flex items-center justify-center gap-2.5 h-11 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 text-sm font-bold text-blue-600 transition-all active:scale-[0.99]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Demo Yükle
                </button>

                <button
                  type="button"
                  onClick={handleSystemCheck}
                  className="flex items-center justify-center gap-2.5 h-11 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-sm font-bold text-amber-600 transition-all active:scale-[0.99]"
                >
                  <Wrench className="w-4 h-4" />
                  Kontrol Et
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* SAĞ KOLON */}
        <div className="space-y-5 h-full">
          <Card className={cn(ui.card, 'h-full')}>
            <div className={cn(ui.header, 'flex items-center justify-between')}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className={cn(ui.kicker, 'text-foreground')}>Güvenlik</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                Güvenli
              </span>
            </div>

            <div className="p-5 space-y-5">
              {/* PIN BLOK */}
              <div className={ui.softCard}>
                <div className={ui.subHeader}>
                  <KeyRound className="w-4 h-4 text-primary" />
                  <span className={ui.subKicker}>Erişim Şifreleme (PIN)</span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  {pinChangeError && (
                    <p className="text-sm font-semibold text-rose-500">{pinChangeError}</p>
                  )}

                  <Button
                    onClick={handleChangePin}
                    disabled={!canSubmitPin}
                    className={cn('w-full', ui.btnPrimary)}
                  >
                    Güncellemeyi Onayla
                  </Button>
                </div>
              </div>

              {/* KURTARMA BLOK */}
              <div className={ui.softCard}>
                <div className={ui.subHeader}>
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className={ui.subKicker}>Hesap Kurtarma</span>
                </div>

                <div className="p-5 space-y-4">
                  <Select
                    value={selectedQuestionVal}
                    onValueChange={(val) => {
                      setSelectedQuestionVal(val)
                      setSecurityQuestion(val !== 'custom' ? val : '')
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        'w-full rounded-xl border-border/30 bg-background px-4',
                        ui.controlHeight,
                        ui.controlText
                      )}
                    >
                      <SelectValue placeholder="Güvenlik sorusu seçin..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {PREDEFINED_QUESTIONS.map((q) => (
                        <SelectItem key={q} value={q} className="text-sm py-3">
                          {q}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="text-sm py-3 text-primary border-t">
                        Kendi sorumu yazacağım...
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedQuestionVal === 'custom' && (
                    <Input
                      value={securityQuestion}
                      onChange={(e) => setSecurityQuestion(e.target.value)}
                      placeholder="Sorunuzu yazın..."
                      className={cn(
                        'rounded-xl bg-background border-border/30 px-4',
                        ui.controlHeight,
                        ui.controlText
                      )}
                    />
                  )}

                  <Input
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Cevabınızı yazın..."
                    className={cn(
                      'rounded-xl bg-background border-border/30 px-4',
                      ui.controlHeight,
                      ui.controlText
                    )}
                  />

                  <Button
                    onClick={() => setShowRecoveryPinModal(true)}
                    disabled={!securityQuestion || !securityAnswer}
                    variant="outline"
                    className={cn('w-full', ui.btnOutline)}
                  >
                    YÖNTEMİ KAYDET
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
            await cafeApi.admin.changePin('', newPin)
            setNewPin('')
            setConfirmPin('')
            setShowChangePinModal(false)
            alert('PIN güncellendi')
          } catch {
            alert('PIN güncellenemedi')
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
            await cafeApi.admin.setRecovery('', securityQuestion.trim(), securityAnswer.trim())
            setSecurityAnswer('')
            setSecurityQuestion('')
            setSelectedQuestionVal('')
            setShowRecoveryPinModal(false)
            alert('Yöntem kaydedildi')
          } catch {
            alert('Yöntem kaydedilemedi')
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
          if (!confirm('DİKKAT: Mevcut tüm veriler silinecektir!')) return

          try {
            await cafeApi.seed.database()
            await Promise.all([refetchTables(), refetchProducts(), refetchCategories()])
            alert('Demo verisi yüklendi')
          } catch {
            alert('Demo yükleme başarısız')
          }
        }}
      />
    </div>
  )
}
