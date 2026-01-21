import { useState, useRef, useEffect } from 'react'
import { Lock, X, HelpCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cafeApi } from '@/lib/api'

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
  // Mode: 'verify' | 'recovery'
  const [mode, setMode] = useState<'verify' | 'recovery'>('verify')

  // Verify State
  const [pin, setPin] = useState<string[]>(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Recovery State
  const [question, setQuestion] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      // Reset state on open
      setPin(['', '', '', ''])
      setError(null)
      setMode('verify')
      setQuestion(null)
      setAnswer('')
      setRecoveryError(null)

      // Focus first input when modal opens
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
    }
  }, [open])

  const handleInputChange = (index: number, value: string): void => {
    if (!/^\d*$/.test(value)) return // Only allow digits

    const newPin = [...pin]
    newPin[index] = value.slice(-1) // Only keep last character
    setPin(newPin)
    setError(null)

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits entered
    if (newPin.every((d) => d !== '') && value) {
      handleVerify(newPin.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent): void => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (pinCode: string): Promise<void> => {
    setIsVerifying(true)
    try {
      const result = await cafeApi.admin.verifyPin(pinCode)
      if (result.valid) {
        onSuccess(pinCode)
        onOpenChange(false)
      } else {
        setError('Yanlış PIN kodu')
        setPin(['', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch {
      setError('Doğrulama başarısız')
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
      // Success
      alert('PIN başarıyla 1234 olarak sıfırlandı.')
      setMode('verify')
      setPin(['', '', '', ''])
      setError(null)
      // Optionally focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'Sıfırlama başarısız')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] transition-all duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'verify' ? (
              <>
                <Lock className="w-5 h-5 text-primary" />
                {title}
              </>
            ) : (
              <>
                <HelpCircle className="w-5 h-5 text-amber-500" />
                Şifre Kurtarma
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'verify'
              ? description
              : 'Güvenlik sorusunu cevaplayarak PIN kodunu sıfırlayın'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {mode === 'verify' ? (
            // Verify Mode
            <>
              <div className="flex gap-4">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-14 h-16 text-center text-3xl font-bold border-2 rounded-xl bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all shadow-sm"
                    disabled={isVerifying}
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm font-medium text-destructive animate-pulse">{error}</p>
              )}

              <div className="w-full space-y-2">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="w-full text-muted-foreground hover:text-foreground"
                  disabled={isVerifying}
                >
                  <X className="w-4 h-4 mr-2" />
                  İptal
                </Button>

                <button
                  onClick={handleForgotPassword}
                  className="w-full text-xs text-muted-foreground hover:text-primary transition-colors underline decoration-dotted"
                >
                  Şifremi Unuttum?
                </button>
              </div>
            </>
          ) : (
            // Recovery Mode
            <div className="w-full space-y-4 animate-in slide-in-from-right-4 duration-300">
              {question ? (
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    GÜVENLİK SORUSU
                  </p>
                  <p className="font-medium text-sm">{question}</p>
                </div>
              ) : (
                !recoveryError && <div className="animate-pulse h-16 bg-muted rounded-lg" />
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium ml-1">Cevabınız</label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full p-3 rounded-lg border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Cevabı buraya yazın..."
                  autoFocus
                />
              </div>

              {recoveryError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {recoveryError}
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => setMode('verify')}
                  className="flex-1"
                  disabled={isResetting}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Geri
                </Button>
                <Button
                  onClick={handleResetPin}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={isResetting || !answer || !question}
                >
                  {isResetting ? (
                    'Sıfırlanıyor...'
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sıfırla
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
