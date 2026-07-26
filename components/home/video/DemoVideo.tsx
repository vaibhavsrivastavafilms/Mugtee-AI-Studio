'use client'

import { useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import { AutoPlayVideo } from '@/components/home/video/AutoPlayVideo'
import { PIPELINE_STAGES, type LandingDemo } from '@/lib/home/landing-demos'
import { cn } from '@/lib/utils'

type DemoVideoProps = {
  demo: LandingDemo
  preload?: 'none' | 'metadata' | 'auto'
  className?: string
  showStages?: boolean
}

export function DemoVideo({
  demo,
  preload = 'metadata',
  className,
  showStages = true,
}: DemoVideoProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div className={cn('relative', className)}>
        <AutoPlayVideo
          src={demo.src}
          poster={demo.poster}
          aspect={demo.aspect}
          preload={preload}
          className="w-full"
        />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute right-3 top-3 inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[rgba(212,175,55,0.35)] bg-black/55 text-[#D4AF37] backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/25"
          aria-label={`Expand ${demo.title}`}
        >
          <Maximize2 className="h-4 w-4" aria-hidden />
        </button>
        {showStages ? (
          <ol className="mt-4 flex flex-wrap justify-center gap-2">
            {PIPELINE_STAGES.map((stage) => (
              <li
                key={stage}
                className="rounded-full border border-[rgba(212,175,55,0.18)] bg-[#141414] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#B8B8B8]"
              >
                {stage}
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {expanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={demo.title}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white"
            aria-label="Close"
            onClick={() => setExpanded(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <AutoPlayVideo
              src={demo.src}
              poster={demo.poster}
              aspect={demo.aspect === 'vertical' ? 'vertical' : 'video'}
              preload="auto"
              className="mx-auto max-h-[80vh] w-full"
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
