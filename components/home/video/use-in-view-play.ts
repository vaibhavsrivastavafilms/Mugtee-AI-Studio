'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

type Options = {
  threshold?: number
  rootMargin?: string
  /** When false, never autoplay from visibility. */
  enabled?: boolean
}

/** Pause media when out of view; play when visible (muted autoplay). */
export function useInViewPlay(
  mediaRef: RefObject<HTMLVideoElement | null>,
  { threshold = 0.35, rootMargin = '40px', enabled = true }: Options = {}
) {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = mediaRef.current
    if (!el || !enabled) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting)
        setInView(visible)
        if (visible) {
          void el.play().catch(() => undefined)
        } else {
          el.pause()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [mediaRef, threshold, rootMargin, enabled])

  return inView
}

export function useVideoSourceReady(src?: string) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const checked = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!src) {
      setReady(false)
      setFailed(true)
      return
    }
    if (checked.current === src) return
    checked.current = src

    let cancelled = false
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.src = src

    const onReady = () => {
      if (cancelled) return
      setReady(true)
      setFailed(false)
    }
    const onFail = () => {
      if (cancelled) return
      setReady(false)
      setFailed(true)
    }

    video.addEventListener('loadeddata', onReady)
    video.addEventListener('error', onFail)
    video.load()

    return () => {
      cancelled = true
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('error', onFail)
      video.removeAttribute('src')
      video.load()
    }
  }, [src])

  return { ready, failed }
}
