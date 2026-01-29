import { useCallback } from 'react'

interface SoundMethods {
  playClick: () => void
  playSuccess: () => void
  playError: () => void
  playAdd: () => void
  playRemove: () => void
  playTabChange: () => void
}

export function useSound(): SoundMethods {
  const playTone = useCallback(
    (
      frequency: number,
      type: 'sine' | 'square' | 'triangle' | 'sawtooth',
      duration: number,
      volume: number = 0.1
    ): void => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return

      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = type
      osc.frequency.setValueAtTime(frequency, ctx.currentTime)

      gain.gain.setValueAtTime(volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + duration)
    },
    []
  )

  const playClick = useCallback(() => {
    // Soft, short click (like a keypress)
    playTone(800, 'sine', 0.05, 0.05)
  }, [playTone])

  const playSuccess = useCallback(() => {
    // Success chime (ascending major triad)
    setTimeout(() => playTone(523.25, 'sine', 0.3, 0.1), 0) // C5
    setTimeout(() => playTone(659.25, 'sine', 0.3, 0.1), 100) // E5
    setTimeout(() => playTone(783.99, 'sine', 0.6, 0.1), 200) // G5
  }, [playTone])

  const playError = useCallback(() => {
    // Error buzz (descending tritone)
    playTone(200, 'sawtooth', 0.3, 0.05)
    setTimeout(() => playTone(150, 'sawtooth', 0.3, 0.05), 150)
  }, [playTone])

  const playAdd = useCallback(() => {
    // Adding item (high blip)
    playTone(1200, 'sine', 0.1, 0.05)
  }, [playTone])

  const playRemove = useCallback(() => {
    // Removing item (low blip)
    playTone(400, 'triangle', 0.1, 0.05)
  }, [playTone])

  const playTabChange = useCallback(() => {
    // Subtle swipe sound attempt
    playTone(300, 'sine', 0.15, 0.03)
  }, [playTone])

  return {
    playClick,
    playSuccess,
    playError,
    playAdd,
    playRemove,
    playTabChange
  }
}
