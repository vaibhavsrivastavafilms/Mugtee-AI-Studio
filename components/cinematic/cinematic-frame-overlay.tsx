'use client'

import { cn } from '@/lib/utils'

export function CinematicFrameOverlay({
  sceneIndex,
  variantLabel,
  active = true,
  className,
}: {
  sceneIndex: number
  variantLabel?: string
  active?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none calm-opacity-transition',
        active ? 'opacity-100' : 'opacity-60',
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
      <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/55 border border-white/[0.08] text-[9px] tracking-[0.22em] uppercase text-[#C8A24E]/90">
        {variantLabel ?? `Frame ${sceneIndex}`}
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">
          Scene {sceneIndex} · Directed frame
        </p>
      </div>
      <div className="absolute inset-0 ring-0 group-hover:ring-1 ring-[#D4AF37]/20 transition rounded-2xl" />
    </div>
  )
}
