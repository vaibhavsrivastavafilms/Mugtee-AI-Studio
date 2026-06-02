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
    abortRef.current = false
    setRunning(true)
    setError(null)
    setPhase('preparing')
    setProgress(0)
    recordExportStarted(projectId)

    const job: BrowserExportJob = {
      id: `browser-${Date.now()}`,
      projectId,
      timeline,
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Browser export failed'
      setError(msg)
      setPhase('failed')
      recordDownloadFailure(msg, projectId, { source: 'browser_export' })
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
