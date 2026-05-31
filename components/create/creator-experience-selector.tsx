'use client'

import { cn } from '@/lib/utils'
import {
  CREATOR_EXPERIENCE_LEVELS,
  type CreatorExperienceLevel,
} from '@/lib/cinematic/creator-experience-level'

const triggerBase =
  'min-h-[36px] flex-1 px-3 text-[11px] tracking-wide transition-all border first:rounded-l-lg last:rounded-r-lg -ml-px first:ml-0'

type CreatorExperienceSelectorProps = {
  value: CreatorExperienceLevel
  onChange: (level: CreatorExperienceLevel) => void
  className?: string
  variant?: 'canvas' | 'landing'
  compact?: boolean
}

export function CreatorExperienceSelector({
  value,
  onChange,
  className,
  variant = 'canvas',
  compact = false,
}: CreatorExperienceSelectorProps) {
  const isLanding = variant === 'landing'

  return (
    <div className={cn(compact ? 'space-y-1' : 'space-y-1.5', className)}>
      {!compact ? (
        <p
          className={cn(
            'text-[9px] tracking-[0.24em] uppercase',
            isLanding ? 'text-[var(--v2-text-secondary)]' : 'text-luxe/45'
          )}
        >
          Experience
        </p>
      ) : null}

      <div
        role="radiogroup"
        aria-label="Creator experience level"
        className={cn(
          'inline-flex w-full max-w-[280px]',
          isLanding && 'max-w-none sm:max-w-[280px]'
        )}
      >
        {CREATOR_EXPERIENCE_LEVELS.map((option) => {
          const active = value === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${option.label} mode — ${option.description}`}
              title={option.description}
              onClick={() => onChange(option.id)}
              className={cn(
                triggerBase,
                isLanding
                  ? active
                    ? 'relative z-10 border-[var(--v2-gold)]/50 bg-[var(--v2-gold)] text-black font-medium shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                    : 'border-[var(--v2-border)] bg-[var(--v2-surface)] text-[var(--v2-text-secondary)] hover:border-[var(--v2-gold)]/30 hover:text-[var(--v2-text-primary)]'
                  : active
                    ? 'relative z-10 border-gold-400/50 bg-gold-gradient text-black shadow-gold-glow font-medium'
                    : 'border-white/[0.08] bg-black/30 text-luxe/65 hover:border-gold-500/25 hover:text-gold-200'
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
