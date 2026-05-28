'use client'

import { memo } from 'react'
import Image from 'next/image'
import { Film, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

const PREVIEW_FRAME =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?crop=entropy&cs=srgb&fm=jpg&q=85&w=640&h=900&fit=crop'

export const ReelPreviewLanding = memo(function ReelPreviewLanding({
  title,
  hook,
  exportProgress = 0,
  loading = false,
}: {
  title: string
  hook: string
  exportProgress?: number
  loading?: boolean
}) {
  return (
    <div className="relative w-full max-w-[220px] mx-auto lg:mx-0 lg:ml-auto">
      <div className="absolute -inset-3 rounded-[1.5rem] bg-gold-500/[0.06] blur-xl" />
      <div
        className={cn(
          'relative aspect-[9/16] rounded-[1.25rem] overflow-hidden border border-gold-soft bg-black/50 shadow-cinema',
          loading && 'shimmer-cinematic'
        )}
      >
        <Image
          src={PREVIEW_FRAME}
          alt=""
          fill
          sizes="220px"
          className="object-cover opacity-90"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/50 border border-gold-500/40 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-5 h-5 text-gold-300 ml-0.5" fill="currentColor" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3 space-y-1.5">
          <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70 truncate">
            {title}
          </p>
          <p className="font-display text-[13px] text-[#F4E7C1] italic leading-snug line-clamp-2">
            {hook}
          </p>
          {exportProgress > 0 ? (
            <div className="pt-1">
              <div className="h-[2px] rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gold-400/80 transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-[9px] text-luxe/45 mt-1 flex items-center gap-1">
                <Film className="w-2.5 h-2.5" />
                {exportProgress >= 100 ? 'MP4 ready' : `Exporting ${exportProgress}%`}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
})
