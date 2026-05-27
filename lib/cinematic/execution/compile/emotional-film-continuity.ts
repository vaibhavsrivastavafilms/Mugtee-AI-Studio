import { readExportMemory } from '@/lib/cinematic/execution/compile/cinematic-export-memory'
import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'

export function emotionalFilmContinuity(
  blueprint: CinematicRenderBlueprint
): string {
  const history = readExportMemory()
  const prior = history.find((h) => h.title !== blueprint.title)
  if (!prior) return blueprint.continuityThread
  return `${blueprint.continuityThread} · echoes ${prior.title.slice(0, 32)}`
}

export function visualSequencePreservation(
  blueprint: CinematicRenderBlueprint
): string {
  const palettes = [...new Set(blueprint.shots.map((s) => s.palette).filter(Boolean))]
  return palettes.slice(0, 2).join(' → ') || blueprint.continuityThread
}
