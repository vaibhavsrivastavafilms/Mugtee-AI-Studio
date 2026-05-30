'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { buildSceneCaptionPlan } from '@/lib/cinematic/captions/word-timing'
import { useSpeechSynthesis } from '@/lib/use-voice'

function sceneNarrationText(scene: GeneratedScene): string {
  return scene.description?.replace(/\s+/g, ' ').trim() || scene.title?.trim() || ''
}

function getSceneAudioWindow(
  scenes: GeneratedScene[],
  totalDurationSec: number,
  sceneIndex: number,
  fallbackText = ''
): { startSec: number; endSec: number } | null {
  if (totalDurationSec <= 0 || sceneIndex < 0 || sceneIndex >= scenes.length) return null

  const plan = buildSceneCaptionPlan(scenes, totalDurationSec, fallbackText)
  const fromPlan = plan.find((entry) => entry.sceneIndex === sceneIndex)
  if (fromPlan) return { startSec: fromPlan.startSec, endSec: fromPlan.endSec }

  const rawTotal = scenes.reduce((sum, scene) => sum + Math.max(2, scene.duration || 4), 0)
  if (rawTotal <= 0) return null

  const scale = totalDurationSec / rawTotal
  let cursor = 0
  for (let i = 0; i < scenes.length; i++) {
    const dur = Math.max(2, (scenes[i].duration || 4) * scale)
    const startSec = cursor
    const endSec = Math.min(cursor + dur, totalDurationSec)
    if (i === sceneIndex) return { startSec, endSec }
    cursor += dur
  }
  return null
}

export function useSceneAudioPlayback({
  scenes,
  voiceUrl,
  fallbackText = '',
}: {
  scenes: GeneratedScene[]
  voiceUrl: string | null
  fallbackText?: string
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const endListenerRef = useRef<(() => void) | null>(null)
  const ttsSceneRef = useRef<number | null>(null)
  const ttsWasSpeakingRef = useRef(false)

  const [playingSceneIndex, setPlayingSceneIndex] = useState<number | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)

  const tts = useSpeechSynthesis()

  const estimatedDuration = useMemo(() => {
    if (audioDuration > 0) return audioDuration
    const raw = scenes.reduce((sum, scene) => sum + Math.max(2, scene.duration || 4), 0)
    return raw || 53
  }, [scenes, audioDuration])

  const clearEndListener = useCallback(() => {
    const audio = audioRef.current
    const listener = endListenerRef.current
    if (audio && listener) {
      audio.removeEventListener('timeupdate', listener)
    }
    endListenerRef.current = null
  }, [])

  const stopAll = useCallback(() => {
    clearEndListener()
    const audio = audioRef.current
    if (audio) audio.pause()
    tts.stop()
    ttsSceneRef.current = null
    ttsWasSpeakingRef.current = false
    setPlayingSceneIndex(null)
  }, [clearEndListener, tts])

  useEffect(() => () => stopAll(), [stopAll])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !voiceUrl) return

    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration)
      }
    }

    audio.src = voiceUrl
    audio.preload = 'metadata'
    audio.addEventListener('loadedmetadata', syncDuration)
    if (audio.readyState >= 1) syncDuration()

    return () => {
      audio.removeEventListener('loadedmetadata', syncDuration)
    }
  }, [voiceUrl])

  useEffect(() => {
    if (tts.speaking) {
      ttsWasSpeakingRef.current = true
      return
    }
    if (ttsWasSpeakingRef.current && ttsSceneRef.current !== null) {
      ttsWasSpeakingRef.current = false
      ttsSceneRef.current = null
      setPlayingSceneIndex(null)
    }
  }, [tts.speaking])

  const canPlayScene = useCallback(
    (index: number) => {
      const scene = scenes[index]
      if (!scene) return false
      if (voiceUrl) {
        return getSceneAudioWindow(scenes, estimatedDuration, index, fallbackText) !== null
      }
      return Boolean(sceneNarrationText(scene)) && tts.supported
    },
    [scenes, voiceUrl, estimatedDuration, fallbackText, tts.supported]
  )

  const getDisabledReason = useCallback(
    (index: number) => {
      if (canPlayScene(index)) return undefined
      const scene = scenes[index]
      if (!scene) return 'Scene unavailable'
      if (!sceneNarrationText(scene)) return 'Generate voice first'
      if (!voiceUrl && !tts.supported) return 'Audio preview unavailable in this browser'
      return 'Generate voice first'
    },
    [canPlayScene, scenes, voiceUrl, tts.supported]
  )

  const toggleSceneAudio = useCallback(
    (index: number) => {
      if (playingSceneIndex === index) {
        stopAll()
        return
      }

      if (!canPlayScene(index)) return

      stopAll()

      if (voiceUrl) {
        const window = getSceneAudioWindow(scenes, estimatedDuration, index, fallbackText)
        const audio = audioRef.current
        if (!window || !audio) return

        const playSlice = () => {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setAudioDuration(audio.duration)
          }
          audio.currentTime = window.startSec
          void audio.play().catch(() => setPlayingSceneIndex(null))
          setPlayingSceneIndex(index)

          const onTimeUpdate = () => {
            if (audio.currentTime >= window.endSec - 0.05) {
              audio.pause()
              clearEndListener()
              setPlayingSceneIndex(null)
            }
          }
          endListenerRef.current = onTimeUpdate
          audio.addEventListener('timeupdate', onTimeUpdate)
        }

        if (audio.readyState >= 1) {
          playSlice()
        } else {
          audio.addEventListener('loadedmetadata', playSlice, { once: true })
          audio.load()
        }
        return
      }

      const text = sceneNarrationText(scenes[index])
      if (!text) return
      ttsSceneRef.current = index
      ttsWasSpeakingRef.current = false
      setPlayingSceneIndex(index)
      tts.speak(text)
    },
    [
      playingSceneIndex,
      stopAll,
      canPlayScene,
      voiceUrl,
      scenes,
      estimatedDuration,
      fallbackText,
      clearEndListener,
      tts,
    ]
  )

  return {
    audioRef,
    playingSceneIndex,
    toggleSceneAudio,
    canPlayScene,
    getDisabledReason,
    stopAll,
  }
}
