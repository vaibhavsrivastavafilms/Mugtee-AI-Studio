'use client'

import { cn } from '@/lib/utils'

type MugteeCompanionCharacterProps = {
  size?: 'sm' | 'md' | 'lg'
  mood?: 'hello' | 'curious' | 'celebrate'
  className?: string
}

const sizeClasses = {
  sm: 'h-20 w-20',
  md: 'h-28 w-28',
  lg: 'h-36 w-36 sm:h-40 sm:w-40',
} as const

/** Minimal premium companion — black form, gold eyes, soft glow. */
export function MugteeCompanionCharacter({
  size = 'md',
  mood = 'hello',
  className,
}: MugteeCompanionCharacterProps) {
  return (
    <div
      className={cn(
        'group relative mx-auto flex items-center justify-center',
        sizeClasses[size],
        className
      )}
      aria-label="Mugtee, a floating creative companion"
      role="img"
    >
      <div
        className="absolute inset-2 rounded-full bg-[#D4AF37]/[0.18] blur-2xl mugtee-world-float"
        aria-hidden
      />
      <svg
        viewBox="0 0 220 220"
        className="relative z-10 h-full w-full mugtee-world-float"
      >
        <defs>
          <radialGradient id="mugteeBody" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#2A2A2A" />
            <stop offset="55%" stopColor="#121212" />
            <stop offset="100%" stopColor="#050505" />
          </radialGradient>
          <radialGradient id="mugteeEyeGold" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#E6C252" />
            <stop offset="100%" stopColor="#D4AF37" />
          </radialGradient>
        </defs>

        <ellipse
          cx="110"
          cy="118"
          rx="62"
          ry="68"
          fill="url(#mugteeBody)"
          stroke="rgba(212,175,55,0.22)"
          strokeWidth="1.5"
        />

        <g className="mugtee-world-blink">
          <circle cx="88" cy="108" r="7" fill="url(#mugteeEyeGold)" />
          <circle cx="132" cy="108" r="7" fill="url(#mugteeEyeGold)" />
          <circle cx="90" cy="106" r="2" fill="#050505" opacity="0.55" />
          <circle cx="134" cy="106" r="2" fill="#050505" opacity="0.55" />
        </g>

        <path
          d={
            mood === 'curious'
              ? 'M96 132C104 138 118 138 126 132'
              : 'M96 130C104 136 118 136 126 130'
          }
          fill="none"
          stroke="rgba(212,175,55,0.45)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {mood === 'celebrate' ? (
          <g fill="#D4AF37" className="mugtee-world-sparkle" opacity="0.55">
            <circle cx="52" cy="72" r="1.5" />
            <circle cx="170" cy="78" r="1.5" />
          </g>
        ) : null}
      </svg>
    </div>
  )
}
