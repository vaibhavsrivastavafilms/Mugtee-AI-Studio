'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { detectExportCapabilities } from '@/lib/export/export-capabilities'
import {
  defaultBrowserExportSettings,
  revokeBrowserExportUrls,
  startExport,
  type BrowserExportJob,
  type BrowserExportPhase,
  type BrowserExportProgress,
} from '@/lib/export/export-orchestrator'
import type { ReelTimeline } from '@/lib/reel/types'
import { recordDownloadSuccess, recordExportStarted, recordDownloadFailure } from '@/lib/export/export-diagnostics'
import { ensureExportSafeTimeline } from '@/lib/export/export-placeholders'
import {
  mugteeExportEnd,
  mugteeExportGroup,
  mugteeExportSnapshot,
} from '@/lib/export/export-log.client'
import { evaluateExportGuard } from '@/lib/export/export-guards.client'

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 800)
}

export function useBrowserExport(options: {
  timeline: ReelTimeline | null
  projectId?: string | null
  filenameBase?: string
}) {
  const { timeline, projectId, filenameBase = 'mugtee-reel' } = options
  const capabilities = useMemo(() => detectExportCapabilities(), [])
  const [phase, setPhase] = useState<BrowserExportPhase | 'idle'>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const abortRef = useRef(false)

  useEffect(() => {
    return () => {
      revokeBrowserExportUrls()
    }
  }, [])

  const settings = useMemo(() => {
    if (!timeline) return null
    return defaultBrowserExportSettings(timeline)
  }, [timeline])

  const blocked = capabilities.blockers.length > 0
  const canStart = Boolean(timeline?.clips?.length) && !blocked && !running

  const runExport = useCallback(async () => {
    if (!timeline || !settings || !canStart) return

    const guard = evaluateExportGuard({
      projectId,
      script: timeline.clips.map((c) => c.title).join('\n'),
      scenes: timeline.clips.map((c) => ({
        id: c.sceneId,
        title: c.title,
        imageUrl: c.image,
      })),
      voiceUrl: timeline.voiceUrl,
    })
    if (!guard.allowed) {
      setError(guard.message ?? 'Generate storyboard before exporting.')
      setPhase('failed')
      return
    }

    abortRef.current = false
    setRunning(true)
    setError(null)
    setPhase('preparing')
    setProgress(0)
    recordExportStarted(projectId)

    const safeTimeline = ensureExportSafeTimeline(timeline)
    mugteeExportGroup('browser_click', { projectId: projectId ?? null })
    mugteeExportSnapshot({
      stage: 'click',
      projectId,
      scenes: safeTimeline.clips,
      storyboards: safeTimeline.clips,
      payload: { strategy: capabilities.recommendedStrategy, settings },
    })

    const job: BrowserExportJob = {
      id: `browser-${Date.now()}`,
      projectId,
      timeline: safeTimeline,
      settings,
      strategy: capabilities.recommendedStrategy,
    }

    const onProgress = (p: BrowserExportProgress) => {
      if (abortRef.current) return
      setPhase(p.phase)
      setProgress(p.progress)
      setMessage(p.message)
    }

    try {
      const result = await startExport(job, onProgress)
      const filename = `${filenameBase}-browser.mp4`
      triggerBlobDownload(result.blob, filename)
      recordDownloadSuccess(projectId, { source: 'browser_export', strategy: result.strategy })
      setPhase('complete')
      setProgress(1)
      setMessage('Download started')
      mugteeExportEnd()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Browser export failed'
      setError(msg)
      setPhase('failed')
      recordDownloadFailure(msg, projectId, { source: 'browser_export' })
      mugteeExportEnd()
    } finally {
      setRunning(false)
    }
  }, [timeline, settings, canStart, projectId, filenameBase, capabilities.recommendedStrategy])

  return {
    capabilities,
    settings,
    phase,
    progress,
    message,
    error,
    running,
    blocked,
    canStart,
    runExport,
  }
}
