import type { ExportFrameProgress } from '@/lib/quick-cut/generation-hud'

export type CinematicExportStageId =
  | 'assembling'
  | 'motion'
  | 'rendering'
  | 'audio'
  | 'encoding'
  | 'download'

export type CinematicExportStage = {
  id: CinematicExportStageId
  step: number
  label: string
  status: 'pending' | 'active' | 'done'
}

const STAGE_DEFS: { id: CinematicExportStageId; step: number; label: string }[] = [
  { id: 'assembling', step: 1, label: 'Assembling Scenes' },
  { id: 'motion', step: 2, label: 'Applying Motion' },
  { id: 'rendering', step: 3, label: 'Rendering Frames' },
  { id: 'audio', step: 4, label: 'Mixing Audio' },
  { id: 'encoding', step: 5, label: 'Encoding MP4' },
  { id: 'download', step: 6, label: 'Preparing Download' },
]

/** Map real export progress % to cinematic stages — no fake timing. */
export function resolveCinematicExportStages(input: {
  exportProgress: ExportFrameProgress | null
  renderStatusLabel?: string | null
  videoUrl?: string | null
}): CinematicExportStage[] {
  const pct = input.exportProgress?.progressPercent ?? 0
  const label = (input.renderStatusLabel ?? input.exportProgress?.label ?? '').toLowerCase()
  const complete = Boolean(input.videoUrl?.trim())

  let activeIndex = 0
  if (complete) {
    activeIndex = STAGE_DEFS.length
  } else if (label.includes('upload') || label.includes('download') || pct >= 95) {
    activeIndex = 5
  } else if (label.includes('encod') || pct >= 78) {
    activeIndex = 4
  } else if (label.includes('audio') || label.includes('voice') || label.includes('mix') || (pct >= 62 && pct < 78)) {
    activeIndex = 3
  } else if (label.includes('frame') || label.includes('render') || pct >= 28) {
    activeIndex = 2
  } else if (label.includes('motion') || pct >= 12) {
    activeIndex = 1
  } else {
    activeIndex = 0
  }

  return STAGE_DEFS.map((def, i) => ({
    ...def,
    status:
      complete || i < activeIndex
        ? 'done'
        : i === activeIndex
          ? 'active'
          : 'pending',
  }))
}

export function cinematicExportHeadline(
  stages: CinematicExportStage[],
  complete: boolean
): string {
  if (complete) return 'Your Film Is Ready'
  const active = stages.find((s) => s.status === 'active')
  return active ? `Building Your Film — ${active.label}` : 'Building Your Film'
}
