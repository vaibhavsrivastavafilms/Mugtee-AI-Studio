'use client'

import { cn } from '@/lib/utils'
import type { HqTier } from '@/lib/multiverse/hq-evolution'

const TIER_STYLES: Record<string, { gradient: string; elements: string }> = {
  desk: {
    gradient: 'from-zinc-900/80 via-zinc-950/90 to-black',
    elements: 'opacity-30',
  },
  corner: {
    gradient: 'from-amber-950/40 via-zinc-950/90 to-black',
    elements: 'opacity-40',
  },
  studio: {
    gradient: 'from-gold-900/20 via-zinc-950/90 to-black',
    elements: 'opacity-50',
  },
  production: {
    gradient: 'from-violet-950/30 via-zinc-950/90 to-black',
    elements: 'opacity-55',
  },
  loft: {
    gradient: 'from-amber-900/25 via-zinc-950/85 to-black',
    elements: 'opacity-60',
  },
  suite: {
    gradient: 'from-gold-800/30 via-zinc-950/80 to-black',
    elements: 'opacity-70',
  },
  house: {
    gradient: 'from-gold-700/25 via-zinc-900/75 to-black',
    elements: 'opacity-75',
  },
  empire: {
    gradient: 'from-gold-600/20 via-amber-950/60 to-black',
    elements: 'opacity-85',
  },
  legendary: {
    gradient: 'from-gold-500/25 via-amber-900/40 to-black',
    elements: 'opacity-95',
  },
}

function HqSvgDecor({ visualKey, className }: { visualKey: string; className?: string }) {
  const tier = Math.min(9, Math.max(1, ['desk', 'corner', 'studio', 'production', 'loft', 'suite', 'house', 'empire', 'legendary'].indexOf(visualKey) + 1))

  return (
    <svg
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="hq-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(212,175,55,0.15)" />
          <stop offset="100%" stopColor="rgba(212,175,55,0.02)" />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill="url(#hq-gold)" />
      {/* Desk / monitor silhouette — scales with tier */}
      <rect x="40" y="120" width={80 + tier * 8} height="4" fill="rgba(212,175,55,0.2)" rx="1" />
      <rect x="60" y="80" width={60 + tier * 6} height={40 - tier} fill="rgba(255,255,255,0.03)" rx="2" />
      {tier >= 3 && (
        <rect x="180" y="90" width="50" height="30" fill="rgba(255,255,255,0.02)" rx="2" />
      )}
      {tier >= 5 && (
        <rect x="260" y="70" width="70" height="50" fill="rgba(212,175,55,0.04)" rx="2" />
      )}
      {tier >= 7 && (
        <>
          <rect x="320" y="50" width="40" height="70" fill="rgba(255,255,255,0.025)" rx="2" />
          <circle cx="340" cy="40" r="8" fill="rgba(212,175,55,0.1)" />
        </>
      )}
      {tier >= 9 && (
        <path
          d="M0 160 Q200 140 400 155 L400 200 L0 200 Z"
          fill="rgba(212,175,55,0.06)"
        />
      )}
    </svg>
  )
}

export function CreatorHqScene({
  hqLevel,
  visualKey = 'desk',
  title,
  className,
}: {
  hqLevel: number
  visualKey?: string
  title?: string
  className?: string
}) {
  const style = TIER_STYLES[visualKey] ?? TIER_STYLES.desk!

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-gold-500/15',
        'bg-gradient-to-br',
        style.gradient,
        className
      )}
    >
      <HqSvgDecor visualKey={visualKey} className={style.elements} />
      <div className="relative z-10 px-5 py-4 sm:px-6 sm:py-5">
        <p className="text-[9px] tracking-[0.28em] uppercase text-gold-300/60 mb-0.5">Creator HQ</p>
        <p className="font-display text-lg sm:text-xl text-luxe/90">
          {title ?? `Level ${hqLevel}`}
        </p>
        <p className="text-[10px] text-luxe/45 mt-1 tabular-nums">HQ Tier {hqLevel} / 100</p>
      </div>
    </div>
  )
}

export function creatorHqFromTier(hq: HqTier) {
  return { level: hq.level, visualKey: hq.visualKey, title: hq.title }
}
