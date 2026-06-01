'use client'

import { useEffect, useRef } from 'react'
import {
  isReelExportStuck,
  REEL_EXPORT_STUCK_MS,
} from '@/lib/reels/export-poll.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { toast } from 'sonner'

/** Resume in-flight reel export polls and auto-start compile when generation finished without MP4. */
export function useReelExportAutoResume(input: {
  enabled?: boolean
  canCompileMp4: boolean
}) {
  const { enabled = true, canCompileMp4 } = input
  const pollStartedRef = useRef(false)

  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const renderStartedAt = useQuickCutGenerationStore((s) => s.renderStartedAt)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)

  const mp4Compiling =
    isRenderingVideo ||
    (videoRenderEnabled && Boolean(renderPollUrl) && !videoUrl && !renderError)

  useEffect(() => {
    if (!enabled || !videoRenderEnabled || !renderPollUrl) {
      pollStartedRef.current = false
      return
    }
    if (videoUrl || renderError || isRenderingVideo) {
      pollStartedRef.current = false
      return
    }
    if (pollStartedRef.current) return

    pollStartedRef.current = true
    void resumeRenderPoll().finally(() => {
      pollStartedRef.current = false
    })
  }, [
    enabled,
    videoRenderEnabled,
    videoUrl,
    renderPollUrl,
    renderError,
    isRenderingVideo,
    resumeRenderPoll,
  ])

  useEffect(() => {
    if (!enabled || !videoRenderEnabled || !isComplete || isGenerating) return
    if (videoUrl || renderPollUrl || renderError || isRenderingVideo) return
    if (!canCompileMp4) return
    if (pollStartedRef.current) return

    pollStartedRef.current = true
    void retryVideoRender().finally(() => {
      pollStartedRef.current = false
    })
  }, [
    enabled,
    videoRenderEnabled,
    isComplete,
    isGenerating,
    videoUrl,
    renderPollUrl,
    renderError,
    isRenderingVideo,
    canCompileMp4,
    retryVideoRender,
  ])

  useEffect(() => {
    if (!enabled || !videoRenderEnabled || !mp4Compiling || !renderStartedAt) return

    const timer = setTimeout(() => {
      if (!isReelExportStuck(renderStartedAt)) return
      if (isRenderingVideo) {
        useQuickCutGenerationStore.setState({ isRenderingVideo: false })
      }
      pollStartedRef.current = false
      toast.message('Export taking longer than expected — retrying…', { duration: 4000 })
      void (renderPollUrl ? resumeRenderPoll() : retryVideoRender())
    }, REEL_EXPORT_STUCK_MS)

    return () => clearTimeout(timer)
  }, [
    enabled,
    videoRenderEnabled,
    mp4Compiling,
    renderStartedAt,
    isRenderingVideo,
    renderPollUrl,
    resumeRenderPoll,
    retryVideoRender,
  ])
}
