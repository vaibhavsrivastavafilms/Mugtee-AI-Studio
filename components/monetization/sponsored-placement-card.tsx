'use client'

import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SponsoredPlacement } from '@/lib/monetization/sponsored-placement-types'

type SponsoredPlacementCardProps = {
  placement: SponsoredPlacement
  onClick?: () => void
  className?: string
  compact?: boolean
}

/** Premium native recommendation card — dark cinematic, clearly labeled Sponsored. */
export function SponsoredPlacementCard({
  placement,
  onClick,
  className,
  compact = false,
}: SponsoredPlacementCardProps) {
  const href = `/api/sponsored-placements/${encodeURIComponent(placement.id)}/click`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={onClick}
      className={cn(
        'group block rounded-xl border border-white/[0.08] bg-black/35',
        'hover:border-gold-500/25 transition-colors duration-200',
        compact ? 'p-3' : 'p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {placement.imageUrl ? (
          <div
            className={cn(
              'relative shrink-0 overflow-hidden rounded-lg border border-white/[0.06] bg-black/50',
              compact ? 'w-10 h-10' : 'w-12 h-12'
            )}
          >
            <Image
              src={placement.imageUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] tracking-[0.28em] uppercase text-luxe/45">
              Sponsored
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-luxe/35 group-hover:text-gold-300/80 transition-colors shrink-0" />
          </div>
          <p className={cn('font-medium text-luxe mt-1', compact ? 'text-sm' : 'text-base')}>
            {placement.title}
          </p>
          {placement.description ? (
            <p className="text-[11px] sm:text-xs text-luxe/55 leading-snug mt-1 line-clamp-2">
              {placement.description}
            </p>
          ) : null}
          <span className="inline-flex mt-2 text-[10px] tracking-[0.14em] uppercase text-gold-300/85 group-hover:text-gold-200 transition-colors">
            {placement.cta}
          </span>
        </div>
      </div>
    </a>
  )
}
