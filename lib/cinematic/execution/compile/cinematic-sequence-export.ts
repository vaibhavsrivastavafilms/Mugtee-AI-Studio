import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import {
  readExportMemory,
  writeExportMemory,
  type ExportMemoryEntry,
} from '@/lib/cinematic/execution/compile/cinematic-export-memory'

export function formatBlueprintForExport(blueprint: CinematicRenderBlueprint): string {
  const shotLines = blueprint.shots.map(
    (s) =>
      `Beat ${s.sceneIndex} (${s.role}, ${s.durationSec}s): ${s.visualPrompt.slice(0, 100)} · ${s.cameraMotion}`
  )

  return [
    '## Cinematic Direction Notes',
    '',
    blueprint.presenceLine,
    '',
    `Rhythm: ${blueprint.filmRhythm}`,
    `Narration: ${blueprint.narrationRhythm}`,
    `Motion: ${blueprint.transitionRhythm}`,
    `Sound bed: ${blueprint.soundtrackBed}`,
    `Visual thread: ${blueprint.continuityThread}`,
    '',
    '### Beat sequence',
    ...shotLines,
  ].join('\n')
}

export function persistExportSequence(
  blueprint: CinematicRenderBlueprint
): ExportMemoryEntry {
  const entry: ExportMemoryEntry = {
    title: blueprint.title,
    hook: blueprint.hook,
    niche: blueprint.continuityThread,
    filmRhythm: blueprint.filmRhythm,
    exportedAt: Date.now(),
  }
  writeExportMemory(entry)
  return entry
}

export function recallLastExportRhythm(): string | null {
  const mem = readExportMemory()
  if (!mem.length) return null
  const last = mem[0]
  return last.filmRhythm ? `Last world: ${last.filmRhythm}` : null
}
