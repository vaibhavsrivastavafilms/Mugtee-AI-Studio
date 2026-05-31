'use client'
// MUGTEE ORB — single-source cinematic AI presence.
// Pure Tailwind / CSS. Four states drive the same DOM tree:
//   • idle      → soft breathing glow (resting)
//   • listening → concentric pulse rings (user speaking)
//   • thinking  → shimmering aureole rotation (AI generating)
//   • speaking  → cinematic audio spectrum (TTS playback)
//
// Premium / restrained / intelligent — no RGB, no Three.js, no extra deps.
// Lives INSIDE the unified creator studio only (per Master Execution mandate).

import { MugteeLogoMark } from '@/components/mugtee/mugtee-logo-mark'
import {
  MugteeSidekickAvatar,
  sidekickAvatarSizeFromPx,
} from '@/components/sidekick/mugtee-sidekick-avatar'
import { cn } from '@/lib/utils'

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

const ORB_BARS = [
  { height: 'h-[34%]', delay: '[animation-delay:0ms]', duration: '[animation-duration:640ms]' },
  { height: 'h-[48%]', delay: '[animation-delay:110ms]', duration: '[animation-duration:700ms]' },
  { height: 'h-[56%]', delay: '[animation-delay:220ms]', duration: '[animation-duration:760ms]' },
  { height: 'h-[42%]', delay: '[animation-delay:330ms]', duration: '[animation-duration:820ms]' },
] as const

export function MugteeOrb({
  state = 'idle',
  size  = 56,
  className,
  useLogo = false,
  variant = 'default',
}: {
  state?: OrbState
  size?: number
  className?: string
  useLogo?: boolean
  /** Character mascot for sidekick surfaces; default orb for assistant chat. */
  variant?: 'default' | 'sidekick'
}) {
  const coreSize = Math.round(size * 0.76)

  if (variant === 'sidekick') {
    return (
      <MugteeSidekickAvatar
        size={sidekickAvatarSizeFromPx(size)}
        animated={state === 'idle'}
        className={className}
      />
    )
  }

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center select-none w-[var(--orb-size)] h-[var(--orb-size)]',
        className
      )}
      style={{ ['--orb-size' as string]: `${size}px` }}
      role="img"
      aria-label={`Mugtee orb — ${state}`}
    >
      {/* Outer halo — always-on soft gold ambient glow */}
      <span
        aria-hidden
        className="orb-halo absolute inset-[-22%] rounded-full blur-2xl opacity-60"
      />

      {/* LISTENING — two ripple rings */}
      {state === 'listening' && (
        <>
          <span aria-hidden className="absolute inset-0 rounded-full border-2 border-amber-300/70 animate-orb-ripple" />
          <span aria-hidden className="absolute inset-0 rounded-full border border-amber-200/40 animate-orb-ripple [animation-delay:0.6s]" />
        </>
      )}

      {/* THINKING — conic shimmer rotating around the core */}
      {state === 'thinking' && (
        <span
          aria-hidden
          className="orb-thinking-shimmer absolute inset-[-8%] rounded-full animate-orb-spin"
        />
      )}

      {/* CORE — gold sphere or brand logo */}
      {useLogo ? (
        <span
          aria-hidden
          className={cn(
            'relative flex items-center justify-center rounded-full overflow-hidden shadow-gold-glow w-[76%] h-[76%]',
            state === 'idle' && 'animate-orb-breathe',
          )}
        >
          <MugteeLogoMark
            size={coreSize}
            className="w-full h-full rounded-full object-cover"
          />
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            'relative rounded-full shadow-gold-glow w-[76%] h-[76%]',
            'bg-[radial-gradient(circle_at_30%_25%,hsl(40_95%_75%)_0%,hsl(36_92%_55%)_38%,hsl(28_82%_28%)_82%,hsl(20_70%_14%)_100%)]',
            state === 'idle' && 'animate-orb-breathe',
          )}
        >
          {/* Specular highlight */}
          <span
            aria-hidden
            className="absolute rounded-full bg-white/35 blur-[2px] top-[14%] left-[20%] w-[28%] h-[20%]"
          />
          {/* Inner rim */}
          <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-inset ring-amber-200/30" />
        </span>
      )}

      {/* SPEAKING — cinematic 4-bar spectrum overlaid on the core */}
      {state === 'speaking' && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center gap-[3px]">
          {ORB_BARS.map((bar, i) => (
            <span
              key={i}
              className={cn(
                'w-[3px] rounded-full bg-black/75 origin-center animate-orb-bar',
                bar.height,
                bar.delay,
                bar.duration,
              )}
            />
          ))}
        </span>
      )}
    </div>
  )
}

export default MugteeOrb
