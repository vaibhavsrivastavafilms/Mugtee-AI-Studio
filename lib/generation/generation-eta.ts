import type {
  CinematicProgressStageId,
  CinematicGenerationProgressSnapshot,
} from '@/lib/quick-cut/cinematic-generation-progress'

/** Seed medians (ms) — refined from recorded runs via generation-stage-timing.client. */
export const DEFAULT_STAGE_DURATION_MS: Record<CinematicProgressStageId, number> = {
  hook: 4_000,
  script: 9_000,
  scenes: 6_000,
  storyboard: 42_000,
  voiceover: 14_000,
  captions: 2_000,
  motion: 1_500,
  export_package: 3_000,
  rendering_mp4: 90_000,
  uploading_assets: 8_000,
  publishing: 0,
}

export type GenerationEtaInput = {
  snapshot: CinematicGenerationProgressSnapshot
  stageAveragesMs: Partial<Record<CinematicProgressStageId, number>>
  currentStageStartedAtMs: number | null
  exportRenderStartedAtMs: number | null
  exportProgressPercent: number
  sceneCount: number
}

export type GenerationEtaResult = {
  etaSeconds: number | null
  etaLabel: string | null
  exportEtaSeconds: number | null
  exportEtaLabel: string | null
  isExportPhase: boolean
}

function avg(
  stageId: CinematicProgressStageId,
  averages: Partial<Record<CinematicProgressStageId, number>>,
  sceneCount: number
): number {
  const fromStore = averages[stageId]
  if (fromStore && fromStore > 0) return fromStore
  let base = DEFAULT_STAGE_DURATION_MS[stageId]
  if (stageId === 'storyboard' && sceneCount > 0) {
    const perScene = base / Math.max(4, sceneCount)
    base = Math.round(perScene * sceneCount)
  }
  return base
}

function partialCurrentStageMs(
  stageId: CinematicProgressStageId | null,
  startedAt: number | null,
  snapshot: CinematicGenerationProgressSnapshot
): number {
  if (!stageId || !startedAt) return 0
  const elapsed = Math.max(0, Date.now() - startedAt)
  const full = avg(stageId, {}, 0)
  return Math.min(elapsed, full * 0.95)
}

/** ETA from remaining stage averages + elapsed time in current stage — no fake timers. */
export function computeGenerationEta(input: GenerationEtaInput): GenerationEtaResult {
  if (input.snapshot.isReady) {
    return {
      etaSeconds: 0,
      etaLabel: null,
      exportEtaSeconds: null,
      exportEtaLabel: null,
      isExportPhase: false,
    }
  }

  const current = input.snapshot.stages.find((s) => s.status === 'current')
  const isExportPhase =
    current?.id === 'rendering_mp4' ||
    current?.id === 'uploading_assets' ||
    Boolean(input.exportRenderStartedAtMs && input.exportProgressPercent > 0 && input.exportProgressPercent < 100)

  if (isExportPhase && input.exportRenderStartedAtMs) {
    const exportEta = computeExportEtaFromProgress(
      input.exportRenderStartedAtMs,
      input.exportProgressPercent
    )
    return {
      etaSeconds: exportEta,
      etaLabel: exportEta != null ? formatEtaLabel(exportEta) : null,
      exportEtaSeconds: exportEta,
      exportEtaLabel:
        exportEta != null ? `Estimated Time Remaining: ${formatEtaLabel(exportEta)}` : null,
      isExportPhase: true,
    }
  }

  let remainingMs = 0
  let foundCurrent = false

  for (const stage of input.snapshot.stages) {
    if (stage.status === 'completed') continue
    if (stage.status === 'current') {
      foundCurrent = true
      const full = avg(stage.id, input.stageAveragesMs, input.sceneCount)
      const partial = partialCurrentStageMs(stage.id, input.currentStageStartedAtMs, input.snapshot)
      remainingMs += Math.max(0, full - partial)
      continue
    }
    if (stage.status === 'pending' || stage.status === 'failed') {
      if (!foundCurrent && stage.group === 'core') {
        /* stages before current in list order */
      }
      remainingMs += avg(stage.id, input.stageAveragesMs, input.sceneCount)
    }
  }

  const etaSeconds = remainingMs > 0 ? Math.max(1, Math.ceil(remainingMs / 1000)) : null

  return {
    etaSeconds,
    etaLabel: etaSeconds != null ? formatEtaLabel(etaSeconds) : null,
    exportEtaSeconds: null,
    exportEtaLabel: null,
    isExportPhase: false,
  }
}

/** Export ETA from actual poll progress + elapsed time since renderStartedAt. */
export function computeExportEtaFromProgress(
  renderStartedAtMs: number,
  progressPercent: number
): number | null {
  const clamped = Math.max(0, Math.min(99, Math.round(progressPercent)))
  if (clamped < 3) return null
  const elapsed = Date.now() - renderStartedAtMs
  if (elapsed < 1_000) return null
  const rate = clamped / elapsed
  if (rate <= 0) return null
  const remainingMs = ((100 - clamped) / rate)
  return Math.max(1, Math.ceil(remainingMs / 1000))
}

export function formatEtaLabel(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function formatTimingBlock(input: {
  generationMs: number | null
  exportMs: number | null
}): { generation: string | null; export: string | null; total: string | null } {
  const gen = input.generationMs != null ? formatEtaLabel(Math.ceil(input.generationMs / 1000)) : null
  const exp = input.exportMs != null ? formatEtaLabel(Math.ceil(input.exportMs / 1000)) : null
  const totalMs = (input.generationMs ?? 0) + (input.exportMs ?? 0)
  const total = totalMs > 0 ? formatEtaLabel(Math.ceil(totalMs / 1000)) : null
  return { generation: gen, export: exp, total }
}
