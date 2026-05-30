'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { HOMEPAGE_POSTERS } from '@/lib/landing/homepage-posters'
import { cn } from '@/lib/utils'

export function PosterGrid({ className }: { className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollNext = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <section className={cn('px-5 sm:px-6 py-20 sm:py-28', className)}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--v2-gold)] mb-3">
              Made with Mugtee
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-[var(--v2-text-primary)]">
              Real stories.{' '}
              <span className="italic text-[var(--v2-gold)]">Cinematic impact.</span>
            </h2>
          </div>
          <Link
            href="/cinematic/examples/psychology-attention"
            className="inline-flex items-center gap-1 text-[11px] tracking-[0.22em] uppercase text-[var(--v2-text-secondary)] hover:text-[var(--v2-gold)] transition-colors"
          >
            Explore more <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-touch pb-2 snap-x snap-mandatory scrollbar-luxe"
          >
            {HOMEPAGE_POSTERS.map((poster) => (
              <Link
                key={poster.slug}
                href={poster.href}
                className="group relative shrink-0 w-[min(100%,280px)] sm:w-[300px] aspect-[9/14] max-h-[440px] rounded-xl border border-[var(--v2-border)] overflow-hidden v2-hover-scale snap-start"
              >
                <Image
                  src={poster.imageUrl}
                  alt={poster.title}
                  fill
                  sizes="300px"
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent z-10" />
                <div className="absolute bottom-0 left-0 right-0 z-20 p-5">
                  <h3 className="font-display text-lg text-[var(--v2-text-primary)] leading-tight group-hover:text-[var(--v2-gold)] transition-colors">
                    {poster.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={scrollNext}
            aria-label="Next posters"
            className="absolute -right-1 top-1/2 -translate-y-1/2 hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-[var(--v2-border)] bg-black/80 text-[var(--v2-gold)] hover:border-[var(--v2-gold)]/40 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  )
}
