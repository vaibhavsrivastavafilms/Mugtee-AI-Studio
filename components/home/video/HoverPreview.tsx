'use client'

import { useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PipelineStageDemo } from '@/components/home/video/PipelineStageDemo'
import { useVideoSourceReady } from '@/components/home/video/use-in-view-play'

type HoverPreviewProps = {
  src?: string
  poster: string
  className?: string
  aspect?: 'video' | 'vertical'
  label?: string
}

/** Plays muted on hover / focus; pauses on leave. Falls back to stage demo. */
export function HoverPreview({
  src,
  poster,
  className,
  aspect = 'vertical',
  label,
}: HoverPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { ready, failed } = useVideoSourceReady(src)
  const useFallback = !src || failed || !ready
  const [hovering, setHovering] = useState(false)

  const play = () => {
    setHovering(true)
    void videoRef.current?.play().catch(() => undefined)
  }
  const pause = () => {
    setHovering(false)
    videoRef.current?.pause()
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#0D0D0D] transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(212,175,55,0.16)] focus-within:shadow-[0_0_40px_rgba(212,175,55,0.16)]',
        aspect === 'vertical' ? 'aspect-[9/16]' : 'aspect-video',
        className
      )}
      onMouseEnter={play}
      onMouseLeave={pause}
      onFocus={play}
      onBlur={pause}
    >
      {useFallback ? (
        <PipelineStageDemo poster={poster} active={hovering} className="absolute inset-0 h-full w-full" />
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          muted
          playsInline
          loop
          preload="none"
          poster={poster}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050505]/85 via-transparent to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        {label ? (
          <span className="truncate text-xs font-medium text-white">{label}</span>
        ) : (
          <span />
        )}
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-black/50 text-[#D4AF37] opacity-90 transition group-hover:scale-110">
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
        </span>
      </div>
    </div>
  )
}
