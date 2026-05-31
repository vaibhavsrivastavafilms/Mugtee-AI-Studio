'use client'

import { cn } from '@/lib/utils'

/** Gold circuit-style corner accents for the Ask Mugtee prompt input. */
export function CircuitInputFrame({
  children,
  className,
  active,
}: {
  children: React.ReactNode
  className?: string
  active?: boolean
}) {
  return (
    <div className={cn('relative group', className)}>
      <div
        className={cn(
          'pointer-events-none absolute -inset-px rounded-[1.55rem] transition-opacity duration-300',
          active ? 'opacity-100' : 'opacity-70 group-focus-within:opacity-100'
        )}
        aria-hidden
      >
        <div
          className={cn(
            'absolute inset-0 rounded-[1.55rem] border transition-colors duration-300',
            active
              ? 'border-gold-500/55 shadow-[0_0_48px_-8px_rgba(212,175,55,0.45)]'
              : 'border-gold-500/35 group-focus-within:border-gold-500/50 group-focus-within:shadow-[0_0_40px_-10px_rgba(212,175,55,0.35)]'
          )}
        />

        <svg
          className="absolute top-0 left-0 w-16 h-16 text-gold-500/50"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden
        >
          <path d="M4 20V4h16" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 4h8M4 12h6" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <circle cx="4" cy="4" r="2" fill="currentColor" opacity="0.8" />
        </svg>
        <svg
          className="absolute top-0 right-0 w-20 h-20 text-gold-500/45 rotate-90"
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden
        >
          <path d="M4 24V4h20" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 4h12M20 4h8M28 8v8M36 12h8" stroke="currentColor" strokeWidth="1" opacity="0.55" />
          <circle cx="4" cy="4" r="2" fill="currentColor" opacity="0.75" />
        </svg>
        <svg
          className="absolute bottom-0 left-0 w-14 h-14 text-gold-500/40 -rotate-90"
          viewBox="0 0 56 56"
          fill="none"
          aria-hidden
        >
          <path d="M4 20V4h16" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 10h10" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        </svg>
        <svg
          className="absolute bottom-0 right-0 w-24 h-24 text-gold-500/55 rotate-180"
          viewBox="0 0 96 96"
          fill="none"
          aria-hidden
        >
          <path d="M4 28V4h24" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 4h16M16 4h12M28 8v12M36 16h12M44 20v8M52 24h8"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
          />
          <circle cx="4" cy="4" r="2.5" fill="currentColor" opacity="0.85" />
          <circle cx="52" cy="28" r="1.5" fill="currentColor" opacity="0.6" />
        </svg>

        <div className="absolute top-3 right-14 w-12 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
        <div className="absolute bottom-5 left-10 w-8 h-px bg-gradient-to-r from-gold-500/30 to-transparent" />
      </div>

      {children}
    </div>
  )
}
