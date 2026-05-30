'use client'
// MUGTEE Audio Spectrum Logo.
//
// A single self-contained component for the cinematic "M" mark with 3 states:
//   1. idle      — subtle breathing gold glow
//   2. listening — expanding pulse rings (mic on)
//   3. speaking  — 5 CSS audio bars dancing (TTS active)
//
// State is read from the global mugteePresence pub/sub. Premium, minimal, cinematic.
// Zero new deps, pure CSS keyframes. No rerenders unless presence changes.

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { mugteePresence } from '@/lib/mugtee-presence'
import { cn } from '@/lib/utils'

function usePresence() {
  return useSyncExternalStore(
    mugteePresence.subscribe,
    () => mugteePresence.get(),
    () => ({ listening: false, speaking: false, intentLabel: null }),
  )
}

const BAR_DELAYS = ['[animation-delay:0s]', '[animation-delay:0.08s]', '[animation-delay:0.16s]', '[animation-delay:0.24s]', '[animation-delay:0.32s]'] as const

export function AudioSpectrumLogo({
  size = 36,
  showLabel = true,
  className,
  href = '/dashboard',
}: {
  size?: number
  showLabel?: boolean
  className?: string
  href?: string
}) {
  const { listening, speaking } = usePresence()
  const state = speaking ? 'speaking' : listening ? 'listening' : 'idle'

  return (
    <Link href={href} className={cn('flex items-center gap-2.5 group select-none', className)} aria-label="Mugtee home">
      <span
        className="mugtee-audio-logo relative inline-flex items-center justify-center shrink-0"
        style={{
          ['--ml-size' as string]: `${size}px`,
          ['--ml-radius' as string]: `${Math.round(size * 0.25)}px`,
          ['--ml-font' as string]: `${Math.round(size * 0.48)}px`,
        }}
        data-state={state}
      >
        {/* Idle breathing glow halo */}
        <span
          aria-hidden
          className={cn(
            'mugtee-audio-logo-halo absolute inset-0 pointer-events-none transition-opacity',
            state === 'idle' ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* Listening: expanding pulse rings */}
        {state === 'listening' && (
          <>
            <span aria-hidden className="mugtee-audio-logo-ring absolute inset-0 pointer-events-none" />
            <span aria-hidden className="mugtee-audio-logo-ring mugtee-audio-logo-ring-delay absolute inset-0 pointer-events-none" />
          </>
        )}

        {/* The actual gold square logo + M */}
        <span
          className={cn(
            'mugtee-audio-logo-mark relative inline-flex items-center justify-center font-display font-black text-black transition-shadow',
            state === 'idle'      && 'shadow-[0_0_18px_-4px_rgba(245,196,77,0.55)]',
            state === 'listening' && 'shadow-[0_0_28px_-2px_rgba(245,196,77,0.85)] scale-[1.02]',
            state === 'speaking'  && 'shadow-[0_0_24px_-4px_rgba(245,196,77,0.7)]',
          )}
        >
          {state === 'speaking' ? (
            <span aria-hidden className="inline-flex items-end gap-[2px] h-[60%]">
              {[0, 1, 2, 3, 4].map(i => (
                <span
                  key={i}
                  className={cn('mugtee-audio-logo-bar block bg-black/85 rounded-[1px]', `mugtee-audio-logo-bar-${i}`, BAR_DELAYS[i])}
                />
              ))}
            </span>
          ) : (
            <span>M</span>
          )}
        </span>
      </span>

      {showLabel && (
        <span className="font-display text-base tracking-wide leading-none">
          <span className="text-gold-gradient">Mugtee</span>
        </span>
      )}

      {/* Scoped keyframes — inlined to avoid touching globals.css */}
      <style jsx global>{`
        .mugtee-audio-logo {
          width: var(--ml-size);
          height: var(--ml-size);
        }
        .mugtee-audio-logo-halo {
          border-radius: var(--ml-radius);
          background: radial-gradient(closest-side, rgba(245,196,77,0.30), rgba(245,196,77,0) 70%);
          animation: mugtee-breathe 3.4s ease-in-out infinite;
        }
        .mugtee-audio-logo-ring {
          border-radius: var(--ml-radius);
          border: 1.5px solid rgba(245,196,77,0.55);
          animation: mugtee-ring 1.4s ease-out infinite;
        }
        .mugtee-audio-logo-ring-delay {
          border-color: rgba(245,196,77,0.35);
          animation-delay: 0.55s;
        }
        .mugtee-audio-logo-mark {
          width: var(--ml-size);
          height: var(--ml-size);
          border-radius: var(--ml-radius);
          font-size: var(--ml-font);
          line-height: 1;
          background: linear-gradient(135deg, #f5c44d 0%, #d4af37 50%, #b8941f 100%);
        }
        .mugtee-audio-logo-bar {
          width: max(1px, calc(var(--ml-size) * 0.06));
        }
        @keyframes mugtee-breathe {
          0%, 100% { transform: scale(1);   opacity: 0.55; }
          50%      { transform: scale(1.18); opacity: 1; }
        }
        @keyframes mugtee-ring {
          0%   { transform: scale(0.85); opacity: 0.75; }
          100% { transform: scale(1.6);  opacity: 0; }
        }
        @keyframes mugtee-bar-0 { 0%,100%{height:25%} 50%{height:88%} }
        @keyframes mugtee-bar-1 { 0%,100%{height:55%} 50%{height:38%} }
        @keyframes mugtee-bar-2 { 0%,100%{height:30%} 50%{height:95%} }
        @keyframes mugtee-bar-3 { 0%,100%{height:65%} 50%{height:42%} }
        @keyframes mugtee-bar-4 { 0%,100%{height:35%} 50%{height:80%} }
        .mugtee-audio-logo-bar-0 { animation: mugtee-bar-0 0.9s ease-in-out infinite; }
        .mugtee-audio-logo-bar-1 { animation: mugtee-bar-1 0.9s ease-in-out infinite; }
        .mugtee-audio-logo-bar-2 { animation: mugtee-bar-2 0.9s ease-in-out infinite; }
        .mugtee-audio-logo-bar-3 { animation: mugtee-bar-3 0.9s ease-in-out infinite; }
        .mugtee-audio-logo-bar-4 { animation: mugtee-bar-4 0.9s ease-in-out infinite; }
      `}</style>
    </Link>
  )
}
