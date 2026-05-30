import type { CinematicNiche } from '@/lib/cinematic/niches'
import { defaultVisualDirection } from '@/lib/cinematic/visual-direction'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import type { VirloContext } from '@/lib/virlo-engine/types'

/** Persisted visual look — separate from scene content so regen preserves palette/camera. */
export type VisualStyle = {
  label: string
  palette: string
  camera: string
  lighting: string
  movement: string
  environment: string
}

/** Virlo viral script layer output (hook + retention + script). */
export type ViralScript = {
  hook: string
  retention_pattern: string
  script: string
}

export type { ViralStructureAnalysis, ViralStructureBeatId } from '@/lib/cinematic/viral-structure'

export type WorkflowState = {
  topic: string
  language: ProjectLanguage
  niche: CinematicNiche
  viralScript: ViralScript | null
  visualStyle: VisualStyle
  tone: string
}

export function visualStyleFromVirloContext(ctx: VirloContext): VisualStyle {
  const niche = ctx.topicAnalysis.niche
  const defaults = defaultVisualDirection(niche, 'single beat')
  return {
    label: ctx.creativeSeed.visualStyle,
    palette: defaults.colorPalette,
    camera: defaults.cameraAngle,
    lighting: defaults.lightingMood,
    movement: defaults.movementStyle,
    environment: defaults.environment,
  }
}

export function sceneVisualDefaults(style: VisualStyle) {
  return {
    cameraAngle: style.camera,
    lightingMood: style.lighting,
    environment: style.environment,
    colorPalette: style.palette,
    movementStyle: style.movement,
  }
}

export function parseVisualStyle(raw: unknown, fallback?: VisualStyle): VisualStyle | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback ?? null
  const row = raw as Record<string, unknown>
  const label = typeof row.label === 'string' ? row.label.trim() : ''
  if (!label) return fallback ?? null
  const fb = fallback ?? {
    label: 'Cinematic vertical',
    palette: 'Natural contrast',
    camera: 'Medium framing',
    lighting: 'Motivated key light',
    movement: 'Slow drift',
    environment: 'Contextual setting',
  }
  return {
    label,
    palette: typeof row.palette === 'string' && row.palette.trim() ? row.palette.trim() : fb.palette,
    camera: typeof row.camera === 'string' && row.camera.trim() ? row.camera.trim() : fb.camera,
    lighting: typeof row.lighting === 'string' && row.lighting.trim() ? row.lighting.trim() : fb.lighting,
    movement: typeof row.movement === 'string' && row.movement.trim() ? row.movement.trim() : fb.movement,
    environment:
      typeof row.environment === 'string' && row.environment.trim()
        ? row.environment.trim()
        : fb.environment,
  }
}

export function parseViralScript(raw: unknown): ViralScript | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const hook = typeof row.hook === 'string' ? row.hook.trim() : ''
  const script = typeof row.script === 'string' ? row.script.trim() : ''
  const retention =
    typeof row.retention_pattern === 'string'
      ? row.retention_pattern.trim()
      : typeof row.retentionPattern === 'string'
        ? row.retentionPattern.trim()
        : ''
  if (!hook && !script) return null
  return {
    hook,
    retention_pattern: retention,
    script,
  }
}

export function retentionPatternFromContext(ctx: VirloContext): string {
  const { retention, structure } = ctx
  return [
    retention.type,
    ...retention.curiosityGaps.slice(0, 2),
    structure.midpointTurn,
  ]
    .filter(Boolean)
    .join(' · ')
}
