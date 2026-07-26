'use client'

import { HoverPreview } from '@/components/home/video/HoverPreview'
import type { LandingDemo } from '@/lib/home/landing-demos'
import { cn } from '@/lib/utils'

type VideoCardProps = {
  demo: LandingDemo
  className?: string
}

export function VideoCard({ demo, className }: VideoCardProps) {
  return (
    <article className={cn('flex flex-col gap-3', className)}>
      <HoverPreview
        src={demo.src}
        poster={demo.poster}
        aspect={demo.aspect ?? 'vertical'}
        label={demo.duration}
      />
      <div className="px-0.5">
        <h3 className="font-display text-xl text-white">{demo.title}</h3>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#888888]">
          {demo.duration} · {demo.style}
        </p>
      </div>
    </article>
  )
}
