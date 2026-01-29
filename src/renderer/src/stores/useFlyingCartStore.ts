import { create } from 'zustand'

interface FlyingItem {
  id: string
  src: string
  startRect: DOMRect
  targetRect?: DOMRect
}

interface FlyingCartState {
  items: FlyingItem[]
  targetRect: DOMRect | null
  setTargetRect: (rect: DOMRect) => void
  addItem: (src: string, startRect: DOMRect) => void
  removeItem: (id: string) => void
}

export const useFlyingCartStore = create<FlyingCartState>((set) => ({
  items: [],
  targetRect: null,
  setTargetRect: (rect) => set({ targetRect: rect }),
  addItem: (src, startRect) => {
    const id = Math.random().toString(36).substring(7)
    set((state) => ({
      items: [...state.items, { id, src, startRect }]
    }))
  },
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id)
    }))
}))
