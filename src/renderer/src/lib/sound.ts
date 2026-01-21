import { useSettingsStore } from '@/store/useSettingsStore'

class SoundManager {
  private context: AudioContext | null = null

  private getContext(): AudioContext {
    if (!this.context) {
      const AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.context = new AudioContext()
    }
    if (!this.context) throw new Error('AudioContext failed to initialize')
    return this.context
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1): void {
    const { soundEnabled } = useSettingsStore.getState()
    if (!soundEnabled) return

    try {
      const ctx = this.getContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime)

      gain.gain.setValueAtTime(vol, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch (e) {
      console.warn('Audio playback failed', e)
    }
  }

  public playClick(): void {
    // Short, high tick
    this.playTone(800, 'sine', 0.1, 0.05)
  }

  public playSuccess(): void {
    // Ding sound (two notes)
    this.playTone(523.25, 'sine', 0.1, 0.1) // C5
    setTimeout(() => this.playTone(1046.5, 'sine', 0.4, 0.1), 50) // C6
  }

  public playError(): void {
    // Sharp buzz (square wave) - simpler and louder
    this.playTone(300, 'square', 0.2, 0.1)
  }

  public playBeep(): void {
    // Standard beep
    this.playTone(440, 'sine', 0.1, 0.1)
  }
}

export const soundManager = new SoundManager()
