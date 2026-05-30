'use client'

import { useEffect, useState } from 'react'
import { Film } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Crossfades storyboard frames — keeps previous image visible during variant switches. */
export function StoryboardCrossfadeImage({
  src,
  alt,
  className,
  parallax = false,
}: {
  src: string
  alt: string
  className?: string
  parallax?: boolean
}) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [previousSrc, setPreviousSrc] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (src === currentSrc) return
    setPreviousSrc(currentSrc)
    setCurrentSrc(src)
    setLoaded(false)
    setFailed(false)
  }, [src, currentSrc])

  useEffect(() => {
    if (!previousSrc) return
    const timer = setTimeout(() => setPreviousSrc(null), 560)
    return () => clearTimeout(timer)
  }, [previousSrc, currentSrc])

  if (failed) {
    return (
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black flex items-center justify-center',
          className
        )}
      >
        <Film className="w-8 h-8 text-[#D4AF37]/40" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden',
        parallax && 'storyboard-focus-parallax',
        className
      )}
    >
      {!loaded ? (
        <div className="absolute inset-0 shimmer-cinematic opacity-50" aria-hidden />
      ) : null}
      {previousSrc ? (
        <img
          src={previousSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[560ms] ease-out pointer-events-none"
          style={{ opacity: loaded ? 0 : 1 }}
        />
      ) : null}
      <img
        src={currentSrc}
        alt={alt}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-[560ms] ease-out',
          loaded ? 'opacity-100 storyboard-focus-zoom' : 'opacity-0'
        )}
      />
    </div>
  )
}
