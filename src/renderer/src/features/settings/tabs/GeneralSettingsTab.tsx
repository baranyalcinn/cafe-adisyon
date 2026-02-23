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
import React, { useEffect, useMemo, useState } from 'react'

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

  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  >('idle')
  const [appVersion, setAppVersion] = useState<string>('...')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const selectedSchemeName = useMemo(
    () => COLOR_SCHEMES.find((c) => c.id === colorScheme)?.name ?? '',
    [colorScheme]
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
    <div className="space-y-4 pb-6">
      {/* ===== ÜST ÖZET STRIP ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                Tema
              </p>
              <p className="text-sm font-extrabold truncate">
                {isDark ? 'Karanlık' : 'Aydınlık'} · {selectedSchemeName}
              </p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
          <div className="p-4 flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                soundEnabled
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                Ses
              </p>
              <p className="text-sm font-extrabold">{soundEnabled ? 'Açık' : 'Kapalı'}</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                Sürüm
              </p>
              <p className="text-sm font-extrabold">{appVersion}</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm shadow-sm">
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                Güvenlik
              </p>
              <p className="text-sm font-extrabold text-emerald-600">Aktif</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ===== ANA GRID ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] gap-4">
        {/* SOL KOLON */}
        <div className="space-y-4">
          {/* GÖRÜNÜM KARTI */}
          <Card className="rounded-2xl border-border/40 bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-black tracking-widest uppercase">Görünüm</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Tema, renk ve ses ayarlarını özelleştir
              </p>
            </div>

            <div className="p-2">
              <SettingRow label="Tema Modu">
                <div className="flex bg-muted/70 rounded-xl p-1 gap-1 border border-border/20">
                  <button
                    type="button"
                    onClick={() => isDark && onThemeToggle()}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all',
                      !isDark
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    )}
                  >
                    <Sun className="w-3 h-3" />
                    Aydınlık
                  </button>
                  <button
                    type="button"
                    onClick={() => !isDark && onThemeToggle()}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all',
                      isDark
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    )}
                  >
                    <Moon className="w-3 h-3" />
                    Karanlık
                  </button>
                </div>
              </SettingRow>

              <SettingRow label="Renk Teması">
                <div className="w-full rounded-xl border border-border/20 bg-muted/40 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {COLOR_SCHEMES.map((scheme) => (
                        <button
                          key={scheme.id}
                          type="button"
                          onClick={() => onColorSchemeChange(scheme.id)}
                          title={scheme.name}
                          className={cn(
                            'relative w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                            colorScheme === scheme.id
                              ? 'bg-background shadow-sm ring-2 ring-primary/30 scale-105'
                              : 'hover:bg-background/60'
                          )}
                        >
                          <div
                            className="w-4.5 h-4.5 rounded-full"
                            style={{ backgroundColor: isDark ? scheme.darkColor : scheme.color }}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
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
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all',
                    soundEnabled
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted text-muted-foreground border-border/30 hover:bg-muted/80'
                  )}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                  {soundEnabled ? 'Ses Açık' : 'Ses Kapalı'}
                </button>
              </SettingRow>
            </div>
          </Card>

          {/* GÜNCELLEME KARTI */}
          <Card className="rounded-2xl border-border/40 bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-blue-500/5 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] font-black tracking-widest uppercase">
                  Yazılım Güncelleme
                </span>
              </div>
              <span className="text-[10px] font-bold font-mono rounded-lg border border-border/30 bg-muted/40 px-2 py-1">
                {appVersion}
              </span>
            </div>

            <div className="p-4">
              <UpdateStatusArea
                status={updateStatus}
                progress={downloadProgress}
                info={updateInfo}
                onCheck={handleManualUpdateCheck}
              />
            </div>
          </Card>

          {/* SİSTEM DURUMU */}
          <Card className="rounded-2xl border-border/40 bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-amber-500/5 to-transparent">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-black tracking-widest uppercase">
                  Sistem Durumu
                </span>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      Veritabanı
                    </p>
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Sağlıklı
                    </span>
                  </div>
                  <p className="text-xl font-black mt-2">{tables.length}</p>
                  <p className="text-[10px] text-muted-foreground">Masa</p>
                </div>

                <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                    Envanter
                  </p>
                  <p className="text-xl font-black mt-2">{products.length}</p>
                  <p className="text-[10px] text-muted-foreground">Ürün</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowDemoPinModal(true)}
                  className="flex items-center justify-center gap-2 h-10 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-600 transition-all active:scale-[0.99]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Demo Yükle
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await Promise.all([refetchTables(), refetchProducts(), refetchCategories()])
                      // TODO: toast.success('Sistem kontrolü tamamlandı')
                      alert('Sistem kontrolü tamamlandı.')
                    } catch {
                      // TODO: toast.error('Sistem kontrolü sırasında hata oluştu')
                      alert('Sistem kontrolü sırasında hata oluştu.')
                    }
                  }}
                  className="flex items-center justify-center gap-2 h-10 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-600 transition-all active:scale-[0.99]"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Kontrol Et
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* SAĞ KOLON */}
        <div className="space-y-4">
          {/* GÜVENLİK KARTI */}
          <Card className="rounded-2xl border-border/40 bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-emerald-500/5 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-black tracking-widest uppercase">Güvenlik</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                Güvenli
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* PIN BLOK */}
              <div className="rounded-2xl border border-border/30 bg-muted/10 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">
                    Erişim Şifreleme (PIN)
                  </span>
                </div>

                <div className="p-4 space-y-3">
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
                      label="TEKRAR GİRİN"
                      value={confirmPin}
                      onChange={(v) => {
                        setConfirmPin(v)
                        setPinChangeError(null)
                      }}
                    />
                  </div>

                  {pinChangeError && (
                    <p className="text-[10px] font-semibold text-rose-500 px-1">{pinChangeError}</p>
                  )}

                  <Button
                    onClick={handleChangePin}
                    disabled={newPin.length !== 4 || confirmPin.length !== 4}
                    className="w-full h-10 rounded-xl text-[11px] font-black tracking-wide"
                  >
                    GÜNCELLEMEYİ ONAYLA
                  </Button>
                </div>
              </div>

              {/* KURTARMA BLOK */}
              <div className="rounded-2xl border border-border/30 bg-muted/10 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">
                    Hesap Kurtarma
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <Select
                    value={selectedQuestionVal}
                    onValueChange={(val) => {
                      setSelectedQuestionVal(val)
                      setSecurityQuestion(val !== 'custom' ? val : '')
                    }}
                  >
                    <SelectTrigger className="w-full text-[11px] h-10 bg-background rounded-xl border-border/30 font-medium px-3">
                      <SelectValue placeholder="Güvenlik sorusu seçin..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {PREDEFINED_QUESTIONS.map((q) => (
                        <SelectItem key={q} value={q} className="text-xs py-2.5">
                          {q}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="text-xs py-2.5 text-primary border-t">
                        Kendi sorumu yazacağım...
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedQuestionVal === 'custom' && (
                    <Input
                      value={securityQuestion}
                      onChange={(e) => setSecurityQuestion(e.target.value)}
                      placeholder="Sorunuzu yazın..."
                      className="h-10 rounded-xl bg-background border-border/30 text-[11px]"
                    />
                  )}

                  <Input
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Cevabınızı yazın..."
                    className="h-10 rounded-xl bg-background border-border/30 text-[11px]"
                  />

                  <Button
                    onClick={() => setShowRecoveryPinModal(true)}
                    disabled={!securityQuestion || !securityAnswer}
                    variant="outline"
                    className="w-full h-10 rounded-xl text-[11px] font-black tracking-wide"
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
            // TODO: toast.success('PIN güncellendi')
            alert('PIN güncellendi')
          } catch {
            // TODO: toast.error('PIN güncellenemedi')
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
            // TODO: toast.success('Kurtarma yöntemi kaydedildi')
            alert('Yöntem kaydedildi')
          } catch {
            // TODO: toast.error('Kurtarma yöntemi kaydedilemedi')
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
          // Şimdilik confirm bırakıyorum; istersen sonraki mesajda custom confirm modal yapısını da veririm
          if (!confirm('DİKKAT: Mevcut tüm veriler silinecektir!')) return

          try {
            await cafeApi.seed.database()
            await Promise.all([refetchTables(), refetchProducts(), refetchCategories()])
            // TODO: toast.success('Demo verisi yüklendi')
            alert('Demo verisi yüklendi')
          } catch {
            // TODO: toast.error('Demo yükleme başarısız')
            alert('Demo yükleme başarısız')
          }
        }}
      />
    </div>
  )
}
