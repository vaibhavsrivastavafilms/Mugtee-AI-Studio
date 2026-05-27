'use client'

import { cn } from '@/lib/utils'

export function CinematicVisualAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 storyboard-atmosphere-layer cinematic-visual-depth',
        className
      )}
      aria-hidden
    />
  )
}

export function StoryboardDepthEnvironment({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent',
        className
      )}
      aria-hidden
    />
  )
}

export function VisualProductionPresence({
  line,
  className,
}: {
  line: string
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-[8px] sm:text-[9px] tracking-[0.22em] uppercase text-[#C8A24E]/50 text-center visual-sequence-opacity',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EmotionalFrameOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 emotional-frame-glow production-frame-focus opacity-70',
        className
      )}
      aria-hidden
    />
  )
}
