import { useState, useEffect, useRef } from 'react'
import { Lock, HelpCircle, RefreshCw, Delete, Fingerprint } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cafeApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AdminPinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (verifiedPin: string) => void
  title?: string
  description?: string
}

export function AdminPinModal({
  open,
  onOpenChange,
  onSuccess,
  title = 'Admin Doğrulama',
  description = 'Bu işlem için admin PIN kodunu girin'
}: AdminPinModalProps): React.JSX.Element {
  const [mode, setMode] = useState<'verify' | 'recovery'>('verify')
  const [pin, setPin] = useState<string>('')
  const [error, setError] = useState<boolean>(false)
  const [isVerifying, setIsVerifying] = useState(false)
  
  // Hidden input ref for keyboard focus
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  // Recovery State
  const [question, setQuestion] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPin('')
      setError(false)
      setMode('verify')
      setQuestion(null)
      setAnswer('')
      setRecoveryError(null)
      
      // Focus hidden input for keyboard entry
      setTimeout(() => hiddenInputRef.current?.focus(), 100)
    }
  }, [open])

  // Keep focus on hidden input
  const handleModalClick = (): void => {
    if (mode === 'verify') hiddenInputRef.current?.focus()
  }

  const handleKeyClick = (num: string): void => {
    if (pin.length >= 4 || isVerifying) return
    setError(false)
    const newPin = pin + num
    setPin(newPin)

    if (newPin.length === 4) {
      handleVerify(newPin)
    }
  }

  const handleKeyboardInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    // We only care about the change if it adds a digit
    if (val.length > pin.length) {
      const lastChar = val.slice(-1)
      if (/^\d$/.test(lastChar)) {
        handleKeyClick(lastChar)
      }
    } else if (val.length < pin.length) {
      handleDelete()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && pin.length === 4) {
      handleVerify(pin)
    } else if (e.key === 'Backspace') {
      handleDelete()
    }
  }

  const handleDelete = (): void => {
    if (pin.length === 0 || isVerifying) return
    setPin(pin.slice(0, -1))
    setError(false)
  }

  const handleVerify = async (pinCode: string): Promise<void> => {
    setIsVerifying(true)
    try {
      const result = await cafeApi.admin.verifyPin(pinCode)
      if (result.valid) {
        // Haptic feel - success
        onSuccess(pinCode)
        onOpenChange(false)
      } else {
        // Fail
        setError(true)
        setTimeout(() => {
          setPin('')
          setError(false)
        }, 500)
      }
    } catch {
      setError(true)
      setTimeout(() => setPin(''), 500)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleForgotPassword = async (): Promise<void> => {
    setMode('recovery')
    setRecoveryError(null)
    try {
      const q = await cafeApi.admin.getRecoveryQuestion()
      if (q) {
        setQuestion(q)
      } else {
        setRecoveryError('Güvenlik sorusu ayarlanmamış.')
      }
    } catch {
      setRecoveryError('Güvenlik sorusu alınamadı.')
    }
  }

  const handleResetPin = async (): Promise<void> => {
    if (!answer) return
    setIsResetting(true)
    try {
      await cafeApi.admin.resetPin(answer)
      alert('PIN başarıyla 1234 olarak sıfırlandı.')
      setMode('verify')
      setPin('')
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'Sıfırlama başarısız')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[400px] p-0 overflow-hidden border-none bg-transparent shadow-none transition-all duration-500",
          error && "animate-shake"
        )}
        onClick={handleModalClick}
      >
        <div className="relative">
          {/* Hidden input for keyboard support */}
          <input
            ref={hiddenInputRef}
            type="text"
            inputMode="numeric"
            value={pin}
            onChange={handleKeyboardInput}
            onKeyDown={handleKeyDown}
            className="absolute opacity-0 pointer-events-none"
            autoFocus
          />
          {/* Decorative Glow */}
          <div
            className={cn(
              'absolute inset-0 blur-[100px] opacity-20 bg-primary rounded-full transition-colors duration-500',
              error && 'bg-destructive'
            )}
          />

          <div className="relative bg-card/80 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 flex flex-col items-center">
            {mode === 'verify' ? (
              <>
                <div className="mb-6 relative">
                  <div
                    className={cn(
                      'w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20',
                      error && 'bg-destructive/10 border-destructive/20'
                    )}
                  >
                    {isVerifying ? (
                      <RefreshCw className="w-10 h-10 text-primary animate-spin" />
                    ) : error ? (
                      <Lock className="w-10 h-10 text-destructive" />
                    ) : (
                      <Fingerprint className="w-10 h-10 text-primary" />
                    )}
                  </div>
                </div>

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-black text-foreground tracking-tight">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">{description}</p>
                </div>

                {/* PIN Dots */}
                <div className="flex gap-4 mb-10">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-4 h-4 rounded-full border-2 transition-all duration-300',
                        pin.length > i
                          ? 'bg-primary border-primary scale-125 shadow-[0_0_15px_rgba(var(--primary),0.5)]'
                          : 'border-muted-foreground/30 scale-100',
                        error && 'border-destructive bg-destructive'
                      )}
                    />
                  ))}
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <button
                      key={n}
                      onClick={() => handleKeyClick(n.toString())}
                      className="h-16 rounded-2xl bg-background/40 border border-white/5 text-xl font-bold hover:bg-primary/20 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setPin('')}
                    className="h-16 rounded-2xl bg-destructive/5 text-destructive/60 hover:bg-destructive/10 text-xs font-bold transition-all"
                  >
                    TEMİZLE
                  </button>
                  <button
                    onClick={() => handleKeyClick('0')}
                    className="h-16 rounded-2xl bg-background/40 border border-white/5 text-xl font-bold hover:bg-primary/20 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    0
                  </button>
                  <button
                    onClick={handleDelete}
                    className="h-16 rounded-2xl bg-background/40 border border-white/5 flex items-center justify-center hover:bg-primary/20 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-primary/40 text-muted-foreground"
                  >
                    <Delete className="w-6 h-6" />
                  </button>
                </div>

                <button
                  onClick={handleForgotPassword}
                  className="mt-8 text-xs font-bold text-muted-foreground hover:text-primary transition-colors tracking-widest uppercase"
                >
                  Şifremi Unuttum?
                </button>
              </>
            ) : (
              // Enhanced Recovery Mode
              <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <HelpCircle className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
                      Kullanıcı Kurtarma
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      Güvenlik sorusu ile sıfırlama
                    </p>
                  </div>
                </div>

                {question ? (
                  <div className="bg-muted/30 p-5 rounded-3xl border border-white/5">
                    <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-2">
                      GÜVENLİK SORUSU
                    </p>
                    <p className="font-bold text-base text-foreground">{question}</p>
                  </div>
                ) : (
                  !recoveryError && <div className="animate-pulse h-20 bg-muted/20 rounded-3xl" />
                )}

                <div className="space-y-3">
                  <label className="text-[10px] font-black ml-1 text-muted-foreground uppercase tracking-widest">
                    Cevabınız
                  </label>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-white/10 bg-background/40 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold"
                    placeholder="Cevabı buraya yazın..."
                    autoFocus
                  />
                </div>

                {recoveryError && (
                  <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-3">
                    <Lock className="w-4 h-4 shrink-0" />
                    {recoveryError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setMode('verify')}
                    className="flex-1 h-14 rounded-2xl font-bold"
                    disabled={isResetting}
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleResetPin}
                    className="flex-[2] h-14 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-lg shadow-amber-900/20"
                    disabled={isResetting || !answer || !question}
                  >
                    {isResetting ? 'Sıfırlanıyor...' : 'Sıfırla'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
