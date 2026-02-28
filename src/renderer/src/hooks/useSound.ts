import { soundManager } from '@/lib/sound'

interface SoundMethods {
  playClick: () => void
  playSuccess: () => void
  playError: () => void
  playAdd: () => void
  playRemove: () => void
  playTabChange: () => void
  playNumpad: () => void
  playBeep: () => void
}

// KRİTİK OPTİMİZASYON: Tüm fonksiyonlar React döngüsünün DIŞINA alındı.
// Uygulama açıldığında bellekte (RAM) sadece 1 kez oluşturulur ve dondurulur.
const SOUND_ACTIONS: SoundMethods = {
  playClick: () => soundManager.playClick(),
  playNumpad: () => soundManager.playNumpad(),
  playSuccess: () => soundManager.playSuccess(),
  playError: () => soundManager.playError(),
  playBeep: () => soundManager.playBeep(),

  // Maps some legacy/specific names to existing manager methods
  playAdd: () => soundManager.playNumpad(),
  playRemove: () => soundManager.playBeep(),
  playTabChange: () => soundManager.playClick()
}

/**
 * Hook based wrapper for soundManager.
 * Ensures consistent audio synthesis across the entire application.
 */
export function useSound(): SoundMethods {
  // React'e sadece statik (sabit) referansı döndürüyoruz.
  // Bu sayede bunu kullanan bileşenler ASLA gereksiz re-render olmaz.
  return SOUND_ACTIONS
}
