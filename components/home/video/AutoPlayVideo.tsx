'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { PipelineStageDemo } from '@/components/home/video/PipelineStageDemo'
import { useInViewPlay, useVideoSourceReady } from '@/components/home/video/use-in-view-play'

export type AutoPlayVideoProps = {
  src?: string
  poster: string
  className?: string
  videoClassName?: string
  /** Preload only the first above-the-fold demo. */
  preload?: 'none' | 'metadata' | 'auto'
  aspect?: 'video' | 'vertical'
  showPipelineFallback?: boolean
}

export function AutoPlayVideo({
  src,
  poster,
  className,
  videoClassName,
  preload = 'none',
  aspect = 'video',
  showPipelineFallback = true,
}: AutoPlayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [fallbackInView, setFallbackInView] = useState(false)
  const { ready, failed } = useVideoSourceReady(src)
  const useFallback = !src || failed || !ready
  useInViewPlay(videoRef, { enabled: !useFallback })

  useEffect(() => {
    const el = rootRef.current
    if (!el || !useFallback) return
    const observer = new IntersectionObserver(
      (entries) => setFallbackInView(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.35, rootMargin: '40px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [useFallback])

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#0D0D0D] shadow-[0_24px_80px_rgba(0,0,0,0.55)]',
        aspect === 'vertical' ? 'aspect-[9/16]' : 'aspect-video',
        className
      )}
    >
      {useFallback ? (
        showPipelineFallback ? (
          <PipelineStageDemo
            poster={poster}
            active={fallbackInView}
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )
      ) : (
        <>
          {!loaded ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt=""
              loading={preload === 'none' ? 'lazy' : 'eager'}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <video
            ref={videoRef}
            className={cn('absolute inset-0 h-full w-full object-cover', videoClassName)}
            muted
            playsInline
            loop
            preload={preload}
            poster={poster}
            onLoadedData={() => setLoaded(true)}
          >
            <source src={src} type="video/mp4" />
          </video>
        </>
      )}
      <div
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[#D4AF37]/10"
        aria-hidden
      />
    </div>
  )
}
