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
    if (!enabled) return

    let el = mediaRef.current
    let detach: (() => void) | undefined
    let pollId: number | undefined

    const bind = (node: HTMLMediaElement) => {
      const syncDuration = () => {
        if (Number.isFinite(node.duration) && node.duration > 0) {
          setDuration(node.duration)
        }
      }

      const syncTime = () => setCurrentTime(node.currentTime)
      const onPlay = () => setIsPlaying(true)
      const onPause = () => setIsPlaying(false)
      const onEnded = () => setIsPlaying(false)

      node.addEventListener('loadedmetadata', syncDuration)
      node.addEventListener('durationchange', syncDuration)
      node.addEventListener('timeupdate', syncTime)
      node.addEventListener('seeked', syncTime)
      node.addEventListener('play', onPlay)
      node.addEventListener('pause', onPause)
      node.addEventListener('ended', onEnded)

      syncDuration()
      syncTime()
      setIsPlaying(!node.paused && !node.ended)

      return () => {
        node.removeEventListener('loadedmetadata', syncDuration)
        node.removeEventListener('durationchange', syncDuration)
        node.removeEventListener('timeupdate', syncTime)
        node.removeEventListener('seeked', syncTime)
        node.removeEventListener('play', onPlay)
        node.removeEventListener('pause', onPause)
        node.removeEventListener('ended', onEnded)
      }
    }

    if (el) {
      detach = bind(el)
    } else {
      pollId = window.setInterval(() => {
        el = mediaRef.current
        if (el) {
          window.clearInterval(pollId)
          pollId = undefined
          detach = bind(el)
        }
      }, 100)
    }

    return () => {
      if (pollId !== undefined) window.clearInterval(pollId)
      detach?.()
    }
  }, [enabled, mediaRef, attachKey])

  return { currentTime, duration, isPlaying }
}
