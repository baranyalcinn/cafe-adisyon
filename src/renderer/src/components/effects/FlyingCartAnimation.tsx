import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function FlyingCartAnimation(): React.JSX.Element {
  const { items, targetRect, removeItem } = useFlyingCartStore()

  if (!targetRect) return <></>

  // Target center position
  const targetX = targetRect.left + targetRect.width / 2 - 12
  const targetY = targetRect.top + targetRect.height / 2 - 12

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999]">
      <AnimatePresence>
        {items.map((item) => {
          // Calculate flight path
          const startX = item.startRect.left
          const startY = item.startRect.top

          // Calculate a control point for the parabola (arc)
          // We want it to go UP before going down/across
          // The peak should be higher than both start and end point
          const midX = (startX + targetX) / 2
          const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2))
          // Arc height depends on distance, min 100px, max 300px
          const arcHeight = Math.min(300, Math.max(100, distance * 0.3))
          const peakY = Math.min(startY, targetY) - arcHeight

          return (
            <motion.div
              key={item.id}
              initial={{
                position: 'fixed',
                top: 0,
                left: 0,
                x: startX,
                y: startY,
                width: item.startRect.width,
                height: item.startRect.height,
                opacity: 0.8,
                scale: 1,
                rotate: 0,
                zIndex: 99999,
                borderRadius: '1rem'
              }}
              animate={{
                x: [startX, midX, targetX], // Linear X usually, or standard ease
                y: [startY, peakY, targetY], // Parabolic Y: Start -> Up -> Target
                width: [item.startRect.width, 40, 24], // Shrink continuously
                height: [item.startRect.height, 40, 24],
                opacity: [0.8, 1, 0], // Fuse into the cart at the end
                scale: [1, 1.2, 0.4], // Pulse up then shrink down
                rotate: [0, 15, 45], // Slight rotation for dynamism
                borderRadius: ['1rem', '50%', '50%'] // Morph to circle
              }}
              transition={{
                duration: 0.7,
                ease: 'circOut', // Overall timing
                times: [0, 0.45, 1], // Timing for keyframes (peak at 45%)
                x: {
                  duration: 0.7,
                  ease: 'linear' // X moves steadily
                },
                y: {
                  duration: 0.7,
                  ease: 'easeInOut' // Y follows the arc curve
                }
              }}
              onAnimationComplete={() => removeItem(item.id)}
              style={{
                background: item.src ? `url(${item.src}) center/cover no-repeat` : undefined
              }}
              className="flex items-center justify-center shadow-2xl overflow-hidden origin-center bg-card border-2 border-white/20"
            >
              {!item.src && <div className="w-full h-full bg-primary/80 backdrop-blur-md" />}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
