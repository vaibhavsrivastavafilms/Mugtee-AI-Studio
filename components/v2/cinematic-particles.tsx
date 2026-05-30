'use client'

import { cn } from '@/lib/utils'

const PARTICLES = [
  { top: '12%', left: '18%', size: 2, dur: '9s', delay: '0s', opacity: 0.35 },
  { top: '28%', left: '72%', size: 3, dur: '11s', delay: '-2s', opacity: 0.25 },
  { top: '45%', left: '8%', size: 2, dur: '10s', delay: '-4s', opacity: 0.3 },
  { top: '62%', left: '85%', size: 2, dur: '12s', delay: '-1s', opacity: 0.2 },
  { top: '78%', left: '42%', size: 3, dur: '8s', delay: '-3s', opacity: 0.28 },
  { top: '18%', left: '52%', size: 1, dur: '7s', delay: '-5s', opacity: 0.4 },
  { top: '55%', left: '58%', size: 2, dur: '13s', delay: '-2.5s', opacity: 0.22 },
  { top: '88%', left: '22%', size: 2, dur: '9.5s', delay: '-1.5s', opacity: 0.18 },
  { top: '35%', left: '92%', size: 1, dur: '8.5s', delay: '-6s', opacity: 0.32 },
  { top: '70%', left: '65%', size: 2, dur: '10.5s', delay: '-3.5s', opacity: 0.24 },
] as const

export function CinematicParticles({ className }: { className?: string }) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="v2-particle"
          style={{
            ['--particle-top' as string]: p.top,
            ['--particle-left' as string]: p.left,
            ['--particle-size' as string]: `${p.size}px`,
            ['--particle-opacity' as string]: String(p.opacity),
            ['--dur' as string]: p.dur,
            ['--delay' as string]: p.delay,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_20%,rgba(212,175,55,0.06),transparent_70%)]" />
    </div>
  )
}
