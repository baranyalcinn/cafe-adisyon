import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFlyingCartStore } from '@/stores/useFlyingCartStore'

export function FlyingCartAnimation(): React.JSX.Element {
  const { items, targetRect, removeItem } = useFlyingCartStore()

  if (!targetRect) return <></>

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999]">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              position: 'fixed',
              top: item.startRect.top,
              left: item.startRect.left,
              width: item.startRect.width,
              height: item.startRect.height,
              opacity: 0.8,
              scale: 1,
              zIndex: 99999
            }}
            animate={{
              top: targetRect.top + targetRect.height / 2 - 12, // Center vertically
              left: targetRect.left + targetRect.width / 2 - 12, // Center horizontally
              width: 24, // Target size
              height: 24,
              opacity: 0.5,
              scale: 0.5
            }}
            transition={{
              duration: 0.6,
              ease: [0.32, 0.72, 0, 1]
            }}
            onAnimationComplete={() => removeItem(item.id)}
            style={{
              position: 'fixed',
              ...(item.src ? { backgroundImage: `url(${item.src})`, backgroundSize: 'cover' } : {})
            }}
            className="flex items-center justify-center rounded-full overflow-hidden shadow-xl"
          >
            {!item.src && (
              <div className="w-full h-full bg-primary/80 backdrop-blur-sm border border-white/20" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
