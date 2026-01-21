import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, Lock, KeyRound, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DashboardView } from '@/features/dashboard/DashboardView'
import { cafeApi, type Table, type Category, type Product } from '@/lib/api'
import { type ColorScheme } from '@/App'
import { TablesTab } from './tabs/TablesTab'
import { CategoriesTab } from './tabs/CategoriesTab'
import { ProductsTab } from './tabs/ProductsTab'
import { LogsTab } from './tabs/LogsTab'
import { MaintenanceTab } from './tabs/MaintenanceTab'
import { AdminPinModal } from '@/components/ui/AdminPinModal'
import { useSettingsStore } from '@/store/useSettingsStore'

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

export function SettingsView({
  isDark,
  onThemeToggle,
  colorScheme,
  onColorSchemeChange
}: SettingsViewProps): React.JSX.Element {
  const { soundEnabled, toggleSound } = useSettingsStore()
  const [tables, setTables] = useState<Table[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // PIN verification state
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [showPinModal, setShowPinModal] = useState(true)

  // PIN change state
  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinChangeError, setPinChangeError] = useState<string | null>(null)
  const [isChangingPin, setIsChangingPin] = useState(false)
  const [showDemoPinModal, setShowDemoPinModal] = useState(false)

  // Recovery Settings state
  const [securityQuestion, setSecurityQuestion] = useState('')
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

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const [tablesData, categoriesData, productsData] = await Promise.all([
        cafeApi.tables.getAll(),
        cafeApi.categories.getAll(),
        cafeApi.products.getAll()
      ])
      // Sort tables by extracting number from name
      const sortedTables = tablesData.sort((a: Table, b: Table) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0
        return numA - numB
      })
      setTables(sortedTables)
      setCategories(categoriesData)
      setProducts(productsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      await loadData()
    })()
  }, [loadData])

  const handlePinSuccess = (): void => {
    setIsUnlocked(true)
    setShowPinModal(false)
  }

  const handleChangePin = async (): Promise<void> => {
    if (newPin.length !== 4) {
      setPinChangeError('PIN 4 haneli olmalıdır')
      return
    }
    if (newPin !== confirmPin) {
      setPinChangeError('PIN kodları eşleşmiyor')
      return
    }

    setIsChangingPin(true)
    setPinChangeError(null)

    try {
      // First verify current PIN by checking if we're unlocked
      // Then change to new PIN - we need current PIN for this
      // Since we're already authenticated, we use a workaround
      // The API expects current PIN, so we'll prompt for it
      setShowChangePinModal(true)
    } catch {
      setPinChangeError('PIN değiştirme başarısız')
    } finally {
      setIsChangingPin(false)
    }
  }

  // If not unlocked, show PIN modal
  if (!isUnlocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background">
        <div className="text-center mb-8">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold">Ayarlar Kilitli</h1>
          <p className="text-muted-foreground mt-2">Devam etmek için admin PIN kodunu girin</p>
        </div>

        <AdminPinModal
          open={showPinModal}
          onOpenChange={(open) => {
            if (!open && !isUnlocked) {
              // User cancelled, show lock screen
              setShowPinModal(false)
            } else {
              setShowPinModal(open)
            }
          }}
          onSuccess={handlePinSuccess}
          title="Ayarlara Erişim"
          description="Admin PIN kodunu girin (varsayılan: 1234)"
        />

        <Button onClick={() => setShowPinModal(true)} className="mt-4">
          <Lock className="w-4 h-4 mr-2" />
          PIN Gir
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs defaultValue="general" className="h-full flex flex-col">
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Ayarlar</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span>Kilit Açık</span>
            </div>
          </div>
          <TabsList>
            <TabsTrigger value="general">Genel</TabsTrigger>
            <TabsTrigger value="tables">Masalar</TabsTrigger>
            <TabsTrigger value="categories">Kategoriler</TabsTrigger>
            <TabsTrigger value="products">Ürünler</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="logs">Loglar</TabsTrigger>
            <TabsTrigger value="maintenance">Bakım</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          {/* General Settings */}
          {/* General Settings */}
          <TabsContent value="general" className="p-6 m-0 h-full overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
              {/* Left Column: Appearance & Preferences */}
              <div className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sun className="w-5 h-5 text-amber-500" />
                      Görünüm ve Tercihler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {/* Theme Mode */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-base font-medium">Karanlık Mod</label>
                        <p className="text-sm text-muted-foreground">
                          Göz yormayan koyu tema deneyimi
                        </p>
                      </div>
                      <Button
                        onClick={onThemeToggle}
                        variant={isDark ? 'default' : 'outline'}
                        className="w-32 transition-all duration-300"
                      >
                        {isDark ? (
                          <>
                            <Moon className="w-4 h-4 mr-2" /> Açık
                          </>
                        ) : (
                          <>
                            <Sun className="w-4 h-4 mr-2" /> Kapalı
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="h-px bg-border/50" />

                    {/* Sound Settings */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-base font-medium">Ses Efektleri</label>
                        <p className="text-sm text-muted-foreground">
                          İşlem yaparken sesli geri bildirim
                        </p>
                      </div>
                      <Button
                        onClick={toggleSound}
                        variant={soundEnabled ? 'default' : 'outline'}
                        className="w-32 transition-all duration-300"
                      >
                        {soundEnabled ? (
                          <>
                            <Volume2 className="w-4 h-4 mr-2" /> Açık
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-4 h-4 mr-2" /> Kapalı
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="h-px bg-border/50" />

                    {/* Color Scheme */}
                    <div className="space-y-4">
                      <div className="space-y-0.5">
                        <label className="text-base font-medium">Renk Teması</label>
                        <p className="text-sm text-muted-foreground">
                          Size en uygun uygulama rengini seçin
                        </p>
                      </div>
                      <div className="grid grid-cols-5 gap-3">
                        {COLOR_SCHEMES.map((scheme) => (
                          <button
                            key={scheme.id}
                            onClick={() => onColorSchemeChange(scheme.id)}
                            className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                              colorScheme === scheme.id
                                ? 'border-primary bg-primary/10'
                                : 'border-transparent bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <div
                              className="w-9 h-9 rounded-full shadow-sm"
                              style={{
                                backgroundColor: isDark ? scheme.darkColor : scheme.color,
                                boxShadow:
                                  colorScheme === scheme.id
                                    ? `0 0 0 3px var(--color-background), 0 0 0 5px ${isDark ? scheme.darkColor : scheme.color}`
                                    : 'none'
                              }}
                            />
                            <span className="text-xs font-medium">{scheme.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Security & System */}
              <div className="space-y-4">
                {/* Security Card - Compact */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-rose-500" />
                      Güvenlik
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Admin PIN kodunu güncelleyin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">Yeni PIN</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={newPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '')
                            setNewPin(val)
                            setPinChangeError(null)
                          }}
                          className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono border rounded-md bg-background"
                          placeholder="••••"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">Tekrar</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={confirmPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '')
                            setConfirmPin(val)
                            setPinChangeError(null)
                          }}
                          className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono border rounded-md bg-background"
                          placeholder="••••"
                        />
                      </div>
                      <Button
                        onClick={handleChangePin}
                        disabled={isChangingPin || newPin.length !== 4 || confirmPin.length !== 4}
                        size="sm"
                        variant="secondary"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                    </div>
                    {pinChangeError && (
                      <p className="text-xs text-destructive mt-2 text-center">{pinChangeError}</p>
                    )}

                    <AdminPinModal
                      open={showChangePinModal}
                      onOpenChange={setShowChangePinModal}
                      onSuccess={async (verifiedPin) => {
                        try {
                          await cafeApi.admin.changePin(verifiedPin, newPin)
                          setNewPin('')
                          setConfirmPin('')
                          setPinChangeError(null)
                          alert('PIN kodu başarıyla değiştirildi. Yeni PIN kodunuzu unutmayın.')
                        } catch (err) {
                          setPinChangeError(err instanceof Error ? err.message : 'Hata oluştu')
                          console.error(err)
                        }
                      }}
                      title="Güvenlik Doğrulaması"
                      description="Mevcut PIN kodunuzu girin"
                    />
                  </CardContent>
                </Card>

                {/* Security Question Card */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-500" />
                      Kurtarma Yöntemi
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Şifrenizi unutursanız sıfırlamak için
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Güvenlik Sorusu</label>
                      <select
                        className="w-full text-sm border rounded-md p-2 bg-background"
                        value={
                          PREDEFINED_QUESTIONS.includes(securityQuestion)
                            ? securityQuestion
                            : 'custom'
                        }
                        onChange={(e) => {
                          if (e.target.value === 'custom') setSecurityQuestion('')
                          else setSecurityQuestion(e.target.value)
                        }}
                      >
                        <option value="" disabled>
                          Seçiniz...
                        </option>
                        {PREDEFINED_QUESTIONS.map((q) => (
                          <option key={q} value={q}>
                            {q}
                          </option>
                        ))}
                        <option value="custom">Kendi sorumu yazacağım...</option>
                      </select>
                      {(!PREDEFINED_QUESTIONS.includes(securityQuestion) &&
                        securityQuestion !== '') ||
                      (securityQuestion === '' &&
                        !PREDEFINED_QUESTIONS.includes(securityQuestion)) ? (
                        <input
                          type="text"
                          placeholder="Özel sorunuzu yazın"
                          value={securityQuestion}
                          onChange={(e) => setSecurityQuestion(e.target.value)}
                          className="w-full text-sm border rounded-md p-2 bg-background mt-2"
                        />
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Cevap</label>
                      <input
                        type="text"
                        placeholder="Cevabınız"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        className="w-full text-sm border rounded-md p-2 bg-background"
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => setShowRecoveryPinModal(true)}
                      disabled={!securityQuestion || !securityAnswer}
                      size="sm"
                      variant="secondary"
                    >
                      Kaydet
                    </Button>

                    {recoveryError && (
                      <p className="text-xs text-destructive text-center">{recoveryError}</p>
                    )}

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
                      title="Onay"
                      description="Ayarları kaydetmek için PIN girin"
                    />
                  </CardContent>
                </Card>

                {/* System Card - Compact */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-500" />
                        Sistem Durumu
                      </CardTitle>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Aktif
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold tabular-nums">{tables.length}</p>
                        <p className="text-xs text-muted-foreground">Masa</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold tabular-nums">{products.length}</p>
                        <p className="text-xs text-muted-foreground">Ürün</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => setShowDemoPinModal(true)}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        Demo Verisi
                      </Button>
                      <AdminPinModal
                        open={showDemoPinModal}
                        onOpenChange={setShowDemoPinModal}
                        onSuccess={async () => {
                          setShowDemoPinModal(false)
                          // Small timeout to allow modal to close smoothly before alert
                          setTimeout(async () => {
                            if (
                              confirm(
                                'DİKKAT: Demo verileri yüklendiğinde MEVCUT TÜM VERİLER SİLİNECEKTİR.\n\nBu işlem geri alınamaz. Devam etmek istiyor musunuz?'
                              )
                            ) {
                              try {
                                await cafeApi.seed.database()
                                await loadData()
                                // Success visual feedback could be added here
                              } catch (error) {
                                console.error('Seed error:', error)
                                alert('Demo veri yükleme başarısız oldu.')
                              }
                            }
                          }, 100)
                        }}
                        title="Demo Verisi Onayı"
                        description="İşlemi onaylamak için admin PIN kodunu girin"
                      />
                      <Button
                        onClick={() => console.log('System check')}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        Kontrol
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tables Management */}
          <TabsContent value="tables" className="p-6 space-y-6 m-0">
            <TablesTab tables={tables} onRefresh={loadData} />
          </TabsContent>

          {/* Categories Management */}
          <TabsContent value="categories" className="p-6 m-0 h-full">
            <CategoriesTab categories={categories} products={products} onRefresh={loadData} />
          </TabsContent>

          {/* Products Management */}
          <TabsContent value="products" className="p-6 m-0 h-full">
            <ProductsTab categories={categories} products={products} onRefresh={loadData} />
          </TabsContent>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="m-0 h-full overflow-auto">
            <DashboardView />
          </TabsContent>

          {/* Activity Logs */}
          <TabsContent value="logs" className="p-6 m-0 h-full">
            <LogsTab />
          </TabsContent>

          {/* Maintenance */}
          <TabsContent value="maintenance" className="p-6 m-0 h-full overflow-auto">
            <MaintenanceTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
