'use client'

import { cn } from '@/lib/utils'

const INTENSITY_LABELS = [
  'Quiet',
  'Soft',
  'Balanced',
  'Elevated',
  'Peak',
] as const

export function VisualIntensityMeter({
  level,
  label,
  className,
}: {
  level: number
  label?: string
  className?: string
}) {
  const clamped = Math.min(5, Math.max(1, Math.round(level)))
  const intensityLabel = label ?? INTENSITY_LABELS[clamped - 1]

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="img"
      aria-label={`Visual intensity: ${intensityLabel}`}
    >
      <span className="text-[8px] tracking-[0.2em] uppercase text-white/30 shrink-0">
        {intensityLabel}
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1 rounded-full transition-all duration-300',
              i < clamped
                ? 'w-3 bg-[#D4AF37]/55'
                : 'w-2 bg-white/10'
            )}
          />
        ))}
      </div>
    </div>
  )
}
