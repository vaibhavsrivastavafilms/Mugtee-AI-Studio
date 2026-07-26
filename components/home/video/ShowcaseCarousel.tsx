'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { VideoCard } from '@/components/home/video/VideoCard'
import type { LandingDemo } from '@/lib/home/landing-demos'
import { cn } from '@/lib/utils'

type ShowcaseCarouselProps = {
  demos: LandingDemo[]
  className?: string
}

export function ShowcaseCarousel({ demos, className }: ShowcaseCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 360), behavior: 'smooth' })
  }

  return (
    <div className={cn('relative', className)}>
      <div className="mb-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(212,175,55,0.25)] text-[#D4AF37] transition hover:bg-[#D4AF37]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/25"
          aria-label="Previous examples"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(212,175,55,0.25)] text-[#D4AF37] transition hover:bg-[#D4AF37]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/25"
          aria-label="Next examples"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="scroll-touch flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {demos.map((demo) => (
          <div key={demo.id} className="w-[220px] shrink-0 sm:w-[240px]">
            <VideoCard demo={demo} />
          </div>
        ))}
      </div>
    </div>
  )
}
