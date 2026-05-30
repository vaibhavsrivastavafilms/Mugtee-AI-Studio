'use client'

import { useEffect, useState, type RefObject } from 'react'

/** Track currentTime and duration from an HTML audio/video element. */
export function useMediaPlaybackTime(
  mediaRef: RefObject<HTMLMediaElement | null>,
  enabled = true,
  /** Re-bind when media src changes or ref attaches */
  attachKey?: string | null
): { currentTime: number; duration: number; isPlaying: boolean } {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setCurrentTime(0)
      setDuration(0)
      setIsPlaying(false)
      return
    }

    let bound: HTMLMediaElement | null = null
    let detach: (() => void) | undefined
    let pollId: number | undefined
    let rafId: number | undefined

    const bind = (node: HTMLMediaElement) => {
      bound = node

      const syncDuration = () => {
        if (Number.isFinite(node.duration) && node.duration > 0) {
          setDuration(node.duration)
        }
      }

      const syncTime = () => setCurrentTime(node.currentTime)
      const onPlay = () => setIsPlaying(true)
      const onPause = () => setIsPlaying(false)
      const onEnded = () => {
        setIsPlaying(false)
        syncTime()
      }

      const tick = () => {
        if (bound !== node) return
        syncTime()
        setIsPlaying(!node.paused && !node.ended)
        if (!node.paused && !node.ended) {
          rafId = requestAnimationFrame(tick)
        }
      }

      const onPlayRaf = () => {
        onPlay()
        if (rafId !== undefined) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(tick)
      }

      const onPauseRaf = () => {
        onPause()
        if (rafId !== undefined) {
          cancelAnimationFrame(rafId)
          rafId = undefined
        }
        syncTime()
      }

      node.addEventListener('loadedmetadata', syncDuration)
      node.addEventListener('durationchange', syncDuration)
      node.addEventListener('timeupdate', syncTime)
      node.addEventListener('seeked', syncTime)
      node.addEventListener('play', onPlayRaf)
      node.addEventListener('pause', onPauseRaf)
      node.addEventListener('ended', onEnded)

      syncDuration()
      syncTime()
      setIsPlaying(!node.paused && !node.ended)
      if (!node.paused && !node.ended) {
        rafId = requestAnimationFrame(tick)
      }

      return () => {
        if (rafId !== undefined) cancelAnimationFrame(rafId)
        node.removeEventListener('loadedmetadata', syncDuration)
        node.removeEventListener('durationchange', syncDuration)
        node.removeEventListener('timeupdate', syncTime)
        node.removeEventListener('seeked', syncTime)
        node.removeEventListener('play', onPlayRaf)
        node.removeEventListener('pause', onPauseRaf)
        node.removeEventListener('ended', onEnded)
        if (bound === node) bound = null
      }
    }

    const tryBind = () => {
      const el = mediaRef.current
      if (!el || el === bound) return
      detach?.()
      detach = bind(el)
    }

    tryBind()
    if (!bound) {
      pollId = window.setInterval(tryBind, 100)
    }

    return () => {
      if (pollId !== undefined) window.clearInterval(pollId)
      detach?.()
    }
  }, [enabled, mediaRef, attachKey])

  return { currentTime, duration, isPlaying }
}
