'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Download, Film, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimelineProject, TimelineResolutionPreset } from '@/types/timeline'
import { TIMELINE_RESOLUTION_PRESETS } from '@/types/timeline'
import { reelExportPollPath } from '@/lib/reels/export-paths'
import { friendlyReelRenderError, REEL_EXPORT_DISABLED_USER_MSG } from '@/lib/video/reel-render-errors'

const PRESET_LABELS: Record<TimelineResolutionPreset, string> = {
  '1080x1920': '1080×1920 (Reels)',
  '720x1280': '720×1280',
  '1080x1080': '1080×1080 (Square)',
  '1920x1080': '1920×1080 (Landscape)',
}

type ExportStudioPanelProps = {
  timeline: TimelineProject
  projectId: string | null
  onResolutionChange: (preset: TimelineResolutionPreset) => void
  onBeforeExport?: () => Promise<void>
  className?: string
}

export function ExportStudioPanel({
  timeline,
  projectId,
  onResolutionChange,
  onBeforeExport,
  className,
}: ExportStudioPanelProps) {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progressLabel, setProgressLabel] = useState<string | null>(null)
  const [videoRenderEnabled, setVideoRenderEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/quick-cut/config')
      .then((r) => r.json())
      .then((data: { videoRenderEnabled?: boolean }) => {
        if (alive) setVideoRenderEnabled(data.videoRenderEnabled === true)
      })
      .catch(() => {
        if (alive) setVideoRenderEnabled(null)
      })
    return () => {
      alive = false
    }
  }, [])

  const startExport = useCallback(async () => {
    if (!projectId) {
      setError('Save the project before exporting.')
      return
    }
    if (videoRenderEnabled === false) {
      setError(REEL_EXPORT_DISABLED_USER_MSG)
      return
    }
    setExporting(true)
    setError(null)
    setProgressLabel('Step 1: Validating timeline…')
    try {
      await onBeforeExport?.()
      setProgressLabel('Step 2: Queuing render…')
      const res = await fetch('/api/timeline/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          timelineJson: timeline,
          quality: '1080p',
          includeVoiceover: true,
          includeCaptions: true,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        jobId?: string | null
        status?: string
        reelUrl?: string
      }
      if (!res.ok) {
        throw new Error(data.error ?? 'Export failed')
      }
      if (data.reelUrl) {
        setProgressLabel('Step 3: Download ready')
        window.open(data.reelUrl, '_blank', 'noopener,noreferrer')
        return
      }
      if (data.jobId) {
        setJobId(data.jobId)
        setProgressLabel('Step 3: Rendering — opens in a new tab when ready')
        window.open(reelExportPollPath(data.jobId, projectId), '_blank')
      }
    } catch (e) {
      setError(friendlyReelRenderError(e instanceof Error ? e.message : 'Export failed'))
      setProgressLabel(null)
    } finally {
      setExporting(false)
    }
  }, [projectId, timeline, onBeforeExport, videoRenderEnabled])

  const renderDisabled = videoRenderEnabled === false

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-gold-300/80" />
        <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/70">
          Export studio
        </p>
      </div>

      {renderDisabled ? (
        <div
          className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 flex items-start gap-2"
          role="status"
        >
          <AlertCircle className="w-4 h-4 text-amber-300/90 shrink-0 mt-0.5" aria-hidden />
          <p className="text-[11px] text-luxe/70 leading-relaxed">{REEL_EXPORT_DISABLED_USER_MSG}</p>
        </div>
      ) : null}

      <label className="block space-y-1">
        <span className="text-[10px] text-luxe/50">Resolution</span>
        <select
          value={timeline.resolution.preset}
          onChange={(e) =>
            onResolutionChange(e.target.value as TimelineResolutionPreset)
          }
          className="w-full rounded border border-white/[0.08] bg-black/40 px-2 py-1.5 text-sm text-luxe/90 min-h-[44px]"
        >
          {(Object.keys(TIMELINE_RESOLUTION_PRESETS) as TimelineResolutionPreset[]).map(
            (preset) => (
              <option key={preset} value={preset}>
                {PRESET_LABELS[preset]}
              </option>
            )
          )}
        </select>
      </label>

      <button
        type="button"
        disabled={exporting || !projectId || renderDisabled || videoRenderEnabled === null}
        onClick={() => void startExport()}
        className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gold-500/35 bg-gold-500/15 py-2.5 text-sm text-gold-100 hover:bg-gold-500/25 disabled:opacity-50 touch-manipulation"
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {exporting ? 'Exporting…' : renderDisabled ? 'MP4 unavailable' : 'Export MP4'}
      </button>

      {progressLabel && !error ? (
        <p className="text-[10px] text-luxe/50" role="status">
          {progressLabel}
        </p>
      ) : null}

      <p className="text-[9px] text-luxe/40">
        GIF and image sequence exports — coming soon (Phase 2).
      </p>

      {jobId ? (
        <p className="text-[10px] text-luxe/50">Render job: {jobId}</p>
      ) : null}
      {error ? (
        <p className="text-[10px] text-amber-200/90 leading-relaxed" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
