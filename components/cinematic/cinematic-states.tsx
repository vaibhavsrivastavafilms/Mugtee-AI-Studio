'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertCircle, Film, RefreshCw, Sparkles } from 'lucide-react'
import { TRUST_COPY } from '@/lib/creator/trust-copy'
import { cn } from '@/lib/utils'

/** Fixed-height shimmer block — prevents layout jump while loading. */
export function CinematicShimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black shimmer-cinematic',
        className
      )}
      aria-hidden
    />
  )
}

export function CinematicContentSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={TRUST_COPY.restoring}>
      <p className="text-center text-[11px] tracking-[0.2em] uppercase text-white/35 mb-2">
        {TRUST_COPY.restoring}
      </p>
      <CinematicShimmer className="h-48 sm:h-56" />
      <CinematicShimmer className="h-32" />
      <CinematicShimmer className="h-24" />
    </div>
  )
}

export function CinematicHydrationGate({ children }: { children: ReactNode }) {
  return <div className="relative min-h-[360px]">{children}</div>
}

export function CinematicEmptyState({
  title,
  message,
  actionHref,
  actionLabel,
}: {
  title: string
  message: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] p-10 sm:p-12 text-center">
      <Film className="w-8 h-8 text-[#D4AF37]/40 mx-auto mb-4" />
      <p className="font-display text-[17px] text-[#F4E7C1]/85 italic leading-snug">
        {title}
      </p>
      <p className="mt-3 text-sm text-white/45 max-w-md mx-auto leading-relaxed">
        {message}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-gradient text-black text-[12px] font-medium shadow-gold-glow hover:opacity-90 transition"
        >
          <Sparkles className="w-3.5 h-3.5" /> {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

export function CinematicErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
  backHref,
  backLabel = 'Go back',
}: {
  title: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className="rounded-[28px] border border-rose-500/15 bg-rose-950/10 p-8 sm:p-10 text-center max-w-lg mx-auto">
      <AlertCircle className="w-8 h-8 text-rose-300/70 mx-auto mb-4" />
      <p className="font-display text-lg text-[#F4E7C1] italic">{title}</p>
      <p className="mt-2 text-sm text-white/50 leading-relaxed">
        {message} {TRUST_COPY.hydration}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-black text-sm font-medium hover:bg-[#E7C56A] transition"
          >
            <RefreshCw className="w-4 h-4" /> {retryLabel}
          </button>
        ) : null}
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white/70 text-sm hover:text-white transition"
          >
            {backLabel}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export function CinematicFadeImage({
  src,
  alt,
  className,
  fallbackClassName,
}: {
  src: string
  alt: string
  className?: string
  fallbackClassName?: string
}) {
  const [displaySrc, setDisplaySrc] = useState(src)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (src === displaySrc) return
    setLoaded(false)
    setFailed(false)
    setDisplaySrc(src)
  }, [src, displaySrc])

  if (failed) {
    return (
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black flex items-center justify-center',
          fallbackClassName
        )}
      >
        <Film className="w-8 h-8 text-[#D4AF37]/40" />
      </div>
    )
  }

  return (
    <>
      {!loaded ? (
        <div className="absolute inset-0 shimmer-cinematic" aria-hidden />
      ) : null}
      <img
        src={displaySrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          className,
          'transition-opacity duration-700 ease-out',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </>
  )
}
