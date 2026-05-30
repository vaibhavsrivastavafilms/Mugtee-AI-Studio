import type { CinematicScene, CinematicVoice } from '@/stores/cinematic-project'

/** User-facing creation milestone derived from existing project fields (no DB columns). */
export type ProjectCreationStatus =
  | 'idea_created'
  | 'hook_generated'
  | 'script_generated'
  | 'storyboard_generated'
  | 'ready_for_production'

export const PROJECT_CREATION_STATUS_LABEL: Record<ProjectCreationStatus, string> = {
  idea_created: 'Idea Created',
  hook_generated: 'Hook Generated',
  script_generated: 'Script Generated',
  storyboard_generated: 'Storyboard Generated',
  ready_for_production: 'Ready For Production',
}

const READY_STATUSES = new Set([
  'compile',
  'complete',
  'completed',
  'exported',
  'reviewing',
  'voiceover',
  'preview',
])

function hasStoryboard(scenes: CinematicScene[]): boolean {
  return scenes.some(
    (scene) =>
      Boolean(scene.imageUrl?.trim()) ||
      scene.storyboardImages?.some((img) => Boolean(img.url?.trim()))
  )
}

function hasVoice(voice: CinematicVoice | null): boolean {
  return Boolean(voice?.audioUrl?.trim())
}

function isReadyForProduction(input: {
  scenes: CinematicScene[]
  voice: CinematicVoice | null
  videoUrl?: string | null
  status?: string | null
}): boolean {
  if (input.videoUrl?.trim()) return true
  if (hasVoice(input.voice)) return true
  if (input.status && READY_STATUSES.has(input.status)) return true
  return false
}

/** Infer the most-advanced creation milestone from stored project data. */
export function deriveProjectCreationStatus(input: {
  hook?: string | null
  script?: string | null
  scenes: CinematicScene[]
  voice: CinematicVoice | null
  videoUrl?: string | null
  status?: string | null
}): ProjectCreationStatus {
  if (isReadyForProduction(input)) return 'ready_for_production'
  if (hasStoryboard(input.scenes)) return 'storyboard_generated'
  if (input.script?.trim()) return 'script_generated'
  if (input.hook?.trim()) return 'hook_generated'
  return 'idea_created'
}

function truncateSnippet(text: string, maxLen = 140): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLen) return normalized
  return `${normalized.slice(0, maxLen - 1).trim()}…`
}

/** Hook preview, or first line of script, from existing project content. */
export function deriveProjectPreviewSnippet(input: {
  hook?: string | null
  script?: string | null
}): string | null {
  const hook = input.hook?.trim()
  if (hook) return truncateSnippet(hook)

  const script = input.script?.trim()
  if (!script) return null

  const lines = script.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) return null

  const snippet = lines.slice(0, 2).join(' ')
  return truncateSnippet(snippet)
}
