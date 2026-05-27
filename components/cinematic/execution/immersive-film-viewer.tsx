'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ImmersiveFilmViewer({
  frames,
  duration,
  className,
  children,
}: {
  frames: string[]
  duration: number
  className?: string
  children: (activeFrame: string | null, activeIndex: number) => ReactNode
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const intervalMs =
    frames.length > 0
      ? Math.max(2400, Math.round((duration * 1000) / frames.length))
      : 3200

  useEffect(() => {
    if (frames.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % frames.length)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [frames.length, intervalMs])

  const activeFrame = frames.length > 0 ? frames[activeIndex] : null

  return (
    <div className={cn('immersive-film-viewer', className)}>
      {children(activeFrame, activeIndex)}
    </div>
  )
}
