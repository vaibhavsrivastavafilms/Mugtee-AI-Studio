import type { ReelTimeline } from '@/lib/reel/types'
import type { ExportStrategy } from '@/lib/export/export-capabilities'

export type BrowserExportPhase =
  | 'preparing'
  | 'rendering'
  | 'encoding'
  | 'muxing'
  | 'finalizing'
  | 'failed'
  | 'complete'

export type BrowserExportSettings = {
  width: number
  height: number
  fps: number
  /** Target duration cap (seconds); defaults to timeline total */
  durationSec?: number
}

export type BrowserExportJob = {
  id: string
  projectId?: string | null
  timeline: ReelTimeline
  settings: BrowserExportSettings
  strategy?: ExportStrategy
}

export type BrowserExportTiming = {
  phase: BrowserExportPhase
  startedAt: number
  phaseStartedAt: number
  phaseDurationsMs: Partial<Record<BrowserExportPhase, number>>
}

export type BrowserExportProgress = {
  phase: BrowserExportPhase
  progress: number
  message: string
  timing: BrowserExportTiming
}

export type BrowserExportResult = {
  blob: Blob
  mimeType: string
  objectUrl: string
  strategy: ExportStrategy
  timing: BrowserExportTiming
}
