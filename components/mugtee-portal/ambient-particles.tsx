'use client'

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'

const PARTICLE_COUNT = 28

function seededOffset(i: number, scale: number) {
  const x = ((i * 17 + 7) % 100) * scale
  const y = ((i * 23 + 11) % 100) * scale
  const size = 1 + (i % 3)
  const duration = 12 + (i % 8) * 2
  const delay = (i % 6) * 0.8
  return { x, y, size, duration, delay }
}

export const AmbientParticles = memo(function AmbientParticles() {
  const particles = useMemo(
    () => Array.from({ length: PARTICLE_COUNT }, (_, i) => seededOffset(i, 1)),
    []
  )

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-gold-400/30"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -18 - (i % 5) * 4, 0],
            opacity: [0.15, 0.45, 0.15],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
})
