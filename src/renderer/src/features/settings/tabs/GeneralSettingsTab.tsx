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
  KeyRound,
  Moon,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sun,
  Volume2,
  VolumeX,
  Wrench
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { PinInput } from '../components/PinInput'
import { SettingRow } from '../components/SettingRow'
import { UpdateStatusArea } from '../components/UpdateStatusArea'

const COLOR_SCHEMES: { id: ColorScheme; name: string; color: string; darkColor: string }[] = [
  {
    id: 'emerald',
    name: 'Sage',
    color: 'oklch(0.55 0.12 165)',
    darkColor: 'oklch(0.7 0.1 165)'
  },
  {
    id: 'ocean',
    name: 'Nordic',
    color: 'oklch(0.45 0.1 230)',
    darkColor: 'oklch(0.65 0.08 230)'
  },
  {
    id: 'violet',
    name: 'Violet',
    color: 'oklch(0.5 0.22 290)',
    darkColor: 'oklch(0.68 0.18 290)'
  },
  {
    id: 'amber',
    name: 'Canyon',
    color: 'oklch(0.6 0.14 55)',
    darkColor: 'oklch(0.72 0.12 55)'
  },
  {
    id: 'rose',
    name: 'Rose',
    color: 'oklch(0.55 0.16 350)',
    darkColor: 'oklch(0.7 0.12 350)'
  }
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

  const PREDEFINED_QUESTIONS = [
    'İlk evcil hayvanınızın adı?',
    'Annenizin kızlık soyadı?',
    'İlk gittiğiniz okulun adı?',
    'En sevdiğiniz yemek?',
    'Doğduğunuz şehir?'
  ]

  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  >('idle')
  const [appVersion, setAppVersion] = useState<string>('...')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [showDemoPinModal, setShowDemoPinModal] = useState(false)

  useEffect(() => {
    window.api.system
      .getVersion()
      .then((v) => setAppVersion(`v${v}`))
      .catch(() => setAppVersion('v1.0.0'))
  }, [])

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-300 pb-6">
      {/* ====== COL 1 ====== */}
      <div className="flex flex-col gap-4">
        {/* GÖRÜNÜM */}
        <Card className="rounded-2xl border-border/30 shadow-sm overflow-hidden bg-card">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-muted/30">
            <Palette className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Görünüm
            </span>
          </div>

          {/* Tema Modu */}
          <SettingRow label="Tema Modu">
            <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => isDark && onThemeToggle()}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all',
                  !isDark
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Sun className="w-3 h-3" /> Aydınlık
              </button>
              <button
                onClick={() => !isDark && onThemeToggle()}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all',
                  isDark
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Moon className="w-3 h-3" /> Karanlık
              </button>
            </div>
          </SettingRow>

          {/* Renk Teması */}
          <SettingRow label="Renk Teması">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {COLOR_SCHEMES.map((scheme) => (
                <button
                  key={scheme.id}
                  onClick={() => onColorSchemeChange(scheme.id)}
                  title={scheme.name}
                  className={cn(
                    'relative w-7 h-7 rounded-md flex items-center justify-center transition-all',
                    colorScheme === scheme.id
                      ? 'bg-background shadow-sm ring-2 ring-primary/30'
                      : 'hover:bg-background/60'
                  )}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: isDark ? scheme.darkColor : scheme.color }}
                  />
                </button>
              ))}
              <div className="w-px h-4 bg-border/40 mx-0.5" />
              <span className="text-[10px] font-bold text-primary pr-1">
                {COLOR_SCHEMES.find((c) => c.id === colorScheme)?.name}
              </span>
            </div>
          </SettingRow>

          {/* Ses */}
          <SettingRow label="Ses Efektleri" description="Bildirim ve etkileşim sesleri" last>
            <button
              onClick={toggleSound}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all',
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
              {soundEnabled ? 'Açık' : 'Kapalı'}
            </button>
          </SettingRow>
        </Card>

        {/* GÜNCELLEME */}
        <Card className="rounded-2xl border-border/30 shadow-sm overflow-hidden bg-card">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20 bg-muted/30">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Yazılım Güncelleme
              </span>
            </div>
            <span className="text-[10px] font-bold font-mono bg-muted px-2 py-0.5 rounded border border-border/30">
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
      </div>
      {/* end col 1 */}

      {/* ====== COL 2 ====== */}
      <div className="flex flex-col gap-4">
        {/* GÜVENLİK */}
        <Card className="rounded-2xl border-border/30 shadow-sm overflow-hidden bg-card">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20 bg-muted/30">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Güvenlik
              </span>
            </div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-400/20">
              GÜVENLİ
            </span>
          </div>

          {/* PIN */}
          <div className="p-4 space-y-3 border-b border-border/20">
            <div className="flex items-center gap-2">
              <KeyRound className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Erişim Şifreleme (PIN)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              size="sm"
              className="w-full h-9 text-[11px] font-bold rounded-lg"
            >
              GÜNCELLEMEYİ ONAYLA
            </Button>
            {pinChangeError && (
              <p className="text-[10px] font-semibold text-rose-500 text-center">
                {pinChangeError}
              </p>
            )}
          </div>

          {/* Hesap Kurtarma */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Hesap Kurtarma
              </span>
            </div>
            <Select
              value={selectedQuestionVal}
              onValueChange={(val) => {
                setSelectedQuestionVal(val)
                setSecurityQuestion(val !== 'custom' ? val : '')
              }}
            >
              <SelectTrigger className="w-full text-[11px] h-9 bg-muted/30 rounded-lg border-none font-medium px-3">
                <SelectValue placeholder="Soru seçin..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-none">
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
                className="h-9 rounded-lg bg-muted/20 border-none text-[11px]"
              />
            )}
            <Input
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="Cevabınızı yazın..."
              className="h-9 rounded-lg bg-muted/20 border-none text-[11px]"
            />
            <Button
              onClick={() => setShowRecoveryPinModal(true)}
              disabled={!securityQuestion || !securityAnswer}
              variant="outline"
              size="sm"
              className="w-full h-9 text-[11px] font-bold rounded-lg"
            >
              YÖNTEMİ KAYDET
            </Button>
          </div>
        </Card>

        {/* SİSTEM DURUMU */}
        <Card className="rounded-2xl border-border/30 shadow-sm overflow-hidden bg-card">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-muted/30">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Sistem Durumu
            </span>
          </div>

          <SettingRow label="Veritabanı">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600">SAĞLIKLI</span>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-bold text-primary leading-none text-right">
                    {tables.length}
                  </p>
                  <p className="text-[9px] font-medium text-muted-foreground mt-0.5">Masa</p>
                </div>
                <div className="w-px h-6 bg-border/30" />
                <div>
                  <p className="text-sm font-bold text-primary leading-none text-right">
                    {products.length}
                  </p>
                  <p className="text-[9px] font-medium text-muted-foreground mt-0.5">Ürün</p>
                </div>
              </div>
            </div>
          </SettingRow>

          <div className="grid grid-cols-2 gap-2 p-3">
            <button
              onClick={() => setShowDemoPinModal(true)}
              className="flex items-center justify-center gap-2 h-10 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/20 text-[11px] font-bold text-blue-500 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Demo Yükle
            </button>
            <button
              onClick={async () => {
                await Promise.all([refetchTables(), refetchProducts(), refetchCategories()])
                alert('Sistem kontrolü tamamlandı.')
              }}
              className="flex items-center justify-center gap-2 h-10 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/20 text-[11px] font-bold text-amber-500 transition-all active:scale-95"
            >
              <Wrench className="w-3.5 h-3.5" /> Kontrol Et
            </button>
          </div>
        </Card>
      </div>
      {/* end col 2 */}

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
