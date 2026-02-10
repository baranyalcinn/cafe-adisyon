import { create } from 'zustand'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

// Track active timers outside of state to avoid re-renders
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>()

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    set((state) => ({ toasts: [...state.toasts, newToast] }))

    if (toast.duration !== Infinity) {
      const timer = setTimeout(() => {
        activeTimers.delete(id)
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }))
      }, toast.duration || 3000)
      activeTimers.set(id, timer)
    }
  },
  dismissToast: (id) => {
    const timer = activeTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      activeTimers.delete(id)
    }
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  }
}))

export const toast = (props: Omit<Toast, 'id'>): void => {
  useToastStore.getState().addToast(props)
}
