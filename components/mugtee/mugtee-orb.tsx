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

import { cn } from '@/lib/utils'

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

export function MugteeOrb({
  state = 'idle',
  size  = 56,
  className,
}: { state?: OrbState; size?: number; className?: string }) {
  return (
    <div
      className={cn('relative inline-flex items-center justify-center select-none', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Mugtee orb — ${state}`}
    >
      {/* Outer halo — always-on soft gold ambient glow */}
      <span
        aria-hidden
        className="absolute inset-[-22%] rounded-full blur-2xl opacity-60"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, hsl(40 92% 60% / 0.45) 0%, hsl(34 88% 38% / 0.18) 45%, transparent 70%)',
        }}
      />

      {/* LISTENING — two ripple rings */}
      {state === 'listening' && (
        <>
          <span aria-hidden className="absolute inset-0 rounded-full border-2 border-amber-300/70 animate-orb-ripple" />
          <span aria-hidden className="absolute inset-0 rounded-full border border-amber-200/40 animate-orb-ripple" style={{ animationDelay: '0.6s' }} />
        </>
      )}

      {/* THINKING — conic shimmer rotating around the core */}
      {state === 'thinking' && (
        <span
          aria-hidden
          className="absolute inset-[-8%] rounded-full animate-orb-spin"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, hsl(40 92% 65%) 90deg, transparent 200deg, hsl(34 88% 50%) 320deg, transparent 360deg)',
            WebkitMask: 'radial-gradient(circle, transparent 55%, black 56%, black 100%)',
                    mask: 'radial-gradient(circle, transparent 55%, black 56%, black 100%)',
          }}
        />
      )}

      {/* CORE orb — gold cinematic sphere */}
      <span
        aria-hidden
        className={cn(
          'relative rounded-full shadow-gold-glow',
          'bg-[radial-gradient(circle_at_30%_25%,hsl(40_95%_75%)_0%,hsl(36_92%_55%)_38%,hsl(28_82%_28%)_82%,hsl(20_70%_14%)_100%)]',
          state === 'idle' && 'animate-orb-breathe',
        )}
        style={{ width: '76%', height: '76%' }}
      >
        {/* Specular highlight */}
        <span
          aria-hidden
          className="absolute rounded-full bg-white/35 blur-[2px]"
          style={{ top: '14%', left: '20%', width: '28%', height: '20%' }}
        />
        {/* Inner rim */}
        <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-inset ring-amber-200/30" />
      </span>

      {/* SPEAKING — cinematic 4-bar spectrum overlaid on the core */}
      {state === 'speaking' && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center gap-[3px]">
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-black/75 origin-center animate-orb-bar"
              style={{
                height: `${[34, 48, 56, 42][i]}%`,
                animationDelay: `${i * 110}ms`,
                animationDuration: `${640 + i * 60}ms`,
              }}
            />
          ))}
        </span>
      )}
    </div>
  )
}

export default MugteeOrb
