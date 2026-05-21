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
  const px = `${size}px`
  const radius = Math.round(size * 0.25)
  const state = speaking ? 'speaking' : listening ? 'listening' : 'idle'

  return (
    <Link href={href} className={cn('flex items-center gap-2.5 group select-none', className)} aria-label="Mugtee home">
      <span
        className="relative inline-flex items-center justify-center shrink-0"
        style={{ width: px, height: px }}
        data-state={state}
      >
        {/* Idle breathing glow halo */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 rounded-[10px] pointer-events-none transition-opacity',
            state === 'idle' ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            background: 'radial-gradient(closest-side, rgba(245,196,77,0.30), rgba(245,196,77,0) 70%)',
            animation: 'mugtee-breathe 3.4s ease-in-out infinite',
            borderRadius: radius,
          }}
        />

        {/* Listening: expanding pulse rings */}
        {state === 'listening' && (
          <>
            <span aria-hidden className="absolute inset-0 rounded-[10px] pointer-events-none" style={{ animation: 'mugtee-ring 1.4s ease-out infinite', borderRadius: radius, border: '1.5px solid rgba(245,196,77,0.55)' }} />
            <span aria-hidden className="absolute inset-0 rounded-[10px] pointer-events-none" style={{ animation: 'mugtee-ring 1.4s ease-out 0.55s infinite', borderRadius: radius, border: '1.5px solid rgba(245,196,77,0.35)' }} />
          </>
        )}

        {/* The actual gold square logo + M */}
        <span
          className={cn(
            'relative inline-flex items-center justify-center font-display font-black text-black transition-shadow',
            state === 'idle'      && 'shadow-[0_0_18px_-4px_rgba(245,196,77,0.55)]',
            state === 'listening' && 'shadow-[0_0_28px_-2px_rgba(245,196,77,0.85)] scale-[1.02]',
            state === 'speaking'  && 'shadow-[0_0_24px_-4px_rgba(245,196,77,0.7)]',
          )}
          style={{
            width: px,
            height: px,
            background: 'linear-gradient(135deg, #f5c44d 0%, #d4af37 50%, #b8941f 100%)',
            borderRadius: radius,
            fontSize: `${Math.round(size * 0.48)}px`,
            lineHeight: 1,
          }}
        >
          {/* Speaking: 5 cinematic audio bars overlay */}
          {state === 'speaking' ? (
            <span aria-hidden className="inline-flex items-end gap-[2px] h-[60%]">
              {[0, 1, 2, 3, 4].map(i => (
                <span
                  key={i}
                  className="block bg-black/85 rounded-[1px]"
                  style={{
                    width: Math.max(1, Math.round(size * 0.06)),
                    animation: `mugtee-bar-${i} 0.9s ease-in-out infinite`,
                    animationDelay: `${i * 0.08}s`,
                  }}
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
      `}</style>
    </Link>
  )
}
