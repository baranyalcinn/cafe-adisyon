import { useSettingsStore } from '@/store/useSettingsStore'

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

class SoundManager {
  private context: AudioContext | null = null
  private readyPromise: Promise<void> | null = null

  // Master chain (volume + optional filters)
  private masterGain: GainNode | null = null

  private get enabled(): boolean {
    return useSettingsStore.getState().soundEnabled
  }

  private ensureContext(): AudioContext {
    if (this.context) return this.context

    const AudioContextClass =
      window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext
    if (!AudioContextClass) throw new Error('Web Audio API not supported')

    const ctx = new AudioContextClass()
    this.context = ctx

    // master gain (tek yerden kontrol)
    this.masterGain = ctx.createGain()
    this.masterGain.gain.value = 0.9
    this.masterGain.connect(ctx.destination)

    return ctx
  }

  /** suspended ise bir kere resume etmeye çalış (çağrı spam olmasın) */
  private async ensureRunning(): Promise<void> {
    const ctx = this.ensureContext()
    if (ctx.state !== 'suspended') return

    if (!this.readyPromise) {
      this.readyPromise = ctx
        .resume()
        .catch(() => {
          /* ignore */
        })
        .finally(() => {
          this.readyPromise = null
        })
    }
    await this.readyPromise
  }

  private now(ctx: AudioContext): number {
    return ctx.currentTime
  }

  private envADSR(
    gain: GainNode,
    t0: number,
    attack: number,
    decay: number,
    sustain: number,
    release: number,
    peak: number
  ): void {
    // pop azaltmak için 0'dan başlat
    gain.gain.cancelScheduledValues(t0)
    gain.gain.setValueAtTime(0.0001, t0)

    // Attack
    gain.gain.linearRampToValueAtTime(peak, t0 + attack)
    // Decay -> sustain
    gain.gain.linearRampToValueAtTime(peak * sustain, t0 + attack + decay)
    // Release
    gain.gain.linearRampToValueAtTime(0.0001, t0 + attack + decay + release)
  }

  private playOscTone(opts: {
    freq: number
    type: OscillatorType
    duration: number
    vol?: number
    delay?: number
    attack?: number
    release?: number
    detune?: number
  }): void {
    if (!this.enabled) return

    const ctx = this.ensureContext()
    void this.ensureRunning()

    const t0 = this.now(ctx) + (opts.delay ?? 0)

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = opts.type
    osc.frequency.setValueAtTime(opts.freq, t0)
    if (opts.detune) osc.detune.setValueAtTime(opts.detune, t0)

    const vol = opts.vol ?? 0.08
    const attack = opts.attack ?? 0.004
    const release = opts.release ?? Math.max(0.01, opts.duration * 0.6)

    // Daha “yumuşak” envelope
    this.envADSR(gain, t0, attack, 0.0, 1.0, release, vol)

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(t0)
    osc.stop(t0 + opts.duration)

    // KRİTİK EKLENTİ 1: Bellek Sızıntısını Önleme
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
    }
  }

  /** Kısa noise burst: filtrelenmiş “tick” */
  private playTick(opts?: { vol?: number; delay?: number }): void {
    if (!this.enabled) return

    const ctx = this.ensureContext()
    void this.ensureRunning()

    const t0 = this.now(ctx) + (opts?.delay ?? 0)

    // 128 sample ~ çok kısa (pop riskini envelope ile kesiyoruz)
    const len = 256
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      // merkezde daha güçlü, uçlarda daha zayıf (daha doğal transient)
      const x = 1 - i / len
      data[i] = (Math.random() * 2 - 1) * x
    }

    const src = ctx.createBufferSource()
    src.buffer = buf

    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.setValueAtTime(900, t0)

    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(1000, t0) // 1600 -> 1000 (Daha kalın ve baslı tık)
    bp.Q.setValueAtTime(1.2, t0)

    const g = ctx.createGain()
    const vol = opts?.vol ?? 0.05
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(vol, t0 + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02)

    src.connect(hp)
    hp.connect(bp)
    bp.connect(g)
    g.connect(this.masterGain!)

    src.start(t0)
    src.stop(t0 + 0.03)

    // KRİTİK EKLENTİ 2: Filtre Zinciri Temizliği (4 Düğümü Koparma)
    src.onended = () => {
      src.disconnect()
      hp.disconnect()
      bp.disconnect()
      g.disconnect()
    }
  }

  // ---- Public API ----

  public playNumpad(): void {
    // “mekanik tık” = transient + koro efektli sıcak gövde
    this.playTick({ vol: 0.055 })

    // Çift osilatör ile analog sıcaklığı (chorus)
    ;[-3, 3].forEach((dt) => {
      this.playOscTone({
        freq: 980,
        type: 'sine',
        duration: 0.04,
        vol: 0.02,
        delay: 0,
        release: 0.02,
        detune: dt,
        attack: 0.003
      })
    })
  }

  public playClick(): void {
    // click = transient + daha pes ve kısa body
    this.playTick({ vol: 0.05 })
    ;[-4, 4].forEach((dt) => {
      this.playOscTone({
        freq: 760,
        type: 'triangle',
        duration: 0.03,
        vol: 0.015,
        delay: 0,
        release: 0.018,
        detune: dt,
        attack: 0.002
      })
    })
  }

  public playPaymentSuccess(): void {
    const vol = 0.08
    // Bir oktav aşağı çekildi (C4 - C5)
    this.playOscTone({ freq: 261.63, type: 'sine', duration: 0.15, vol, delay: 0 })
    this.playOscTone({ freq: 523.25, type: 'sine', duration: 0.3, vol, delay: 0.07 })
  }

  public playBeep(): void {
    this.playOscTone({ freq: 440, type: 'sine', duration: 0.08, vol: 0.07 })
  }

  public playSuccess(): void {
    // KLASİK & SEVİLEN RİTİM — (Do-Mi-Sol) 100ms aralıklı yükseliş
    // Bu ritim kullanıcı tarafından en çok beğenilen ve hatırlanan versiyon.
    this.ensureContext()
    const vol = 0.08

    const ding = (f: number, delay: number, duration: number): void => {
      this.playOscTone({
        freq: f,
        type: 'sine',
        duration: duration,
        vol: vol,
        delay: delay,
        attack: 0.015,
        release: duration * 0.8
      })
    }

    // Dokunsal geribildirim (Hafif temas tıkı)
    this.playTick({ vol: 0.02 })

    // O sevdiğiniz klasik 3 tonlu yükseliş
    ding(523.25, 0.0, 0.6) // C5
    ding(659.25, 0.12, 0.6) // E5
    ding(783.99, 0.24, 0.8) // G5
  }

  public playError(): void {
    // GENTLE "OOPS" SIGNATURE 🚫
    // Keskin testere dişi (sawtooth) ve uyumsuzluk yerine, tok ve kauçuksu bir düşüş.
    // Kasiyeri uyarır ama cezalandırılmış hissettirmez (iOS Error stili)
    this.ensureContext()
    const vol = 0.04

    const softBoop = (
      f: number,
      delay: number,
      duration: number,
      isLast: boolean = false
    ): void => {
      // Tok ve bas ağırlıklı yuvarlak dalga (Sine)
      this.playOscTone({
        freq: f,
        type: 'sine',
        duration: duration,
        vol: vol,
        delay: delay,
        attack: 0.01,
        release: duration * 0.7
      })
      // Çok hafif ahşap/plastik vurma dokusu için Triangle
      this.playOscTone({
        freq: f,
        type: 'triangle',
        duration: duration * 0.5,
        vol: vol * 0.15,
        delay: delay,
        attack: 0.005,
        release: duration * 0.4
      })

      // Eğer son notaysa, daha da derinlik katmak için alt oktavda bir destek
      if (isLast) {
        this.playOscTone({
          freq: f / 2,
          type: 'sine',
          duration: duration * 1.2,
          vol: vol * 0.6,
          delay: delay,
          attack: 0.02,
          release: duration
        })
      }
    }

    // Notalar: Eb4 (311Hz) -> C4 (261Hz)
    // Klasik "düşüş/olumsuz" hissi, ama çok naif bir enstrümanla
    softBoop(311.13, 0.0, 0.15) // Eb4
    softBoop(261.63, 0.12, 0.35, true) // C4 (Biraz daha uzun sönüm)
  }
}

export const soundManager = new SoundManager()
