import {
  parseCaptionsPayload,
  type CaptionsPayload,
} from '@/lib/cinematic/generation'
import { inferProjectMode } from '@/lib/cinematic/project-mode'
import { sanitizeScenesFromPersistence } from '@/lib/cinematic/sanitize-persisted-assets'
import type { CinematicProjectRow } from '@/lib/cinematic-projects'
import type { CinematicScene } from '@/stores/cinematic-project'

/** Public-safe project card for the Made With Mugtee gallery. */
export type ShowcaseProject = {
  id: string
  title: string
  /** Creator niche or platform label for the card badge. */
  category: string
  hookPreview: string
  thumbnailUrl: string | null
  description: string
  updatedAt: string
}

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 24

export function clampShowcaseLimit(raw: string | null | undefined): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(MAX_LIMIT, Math.floor(n))
}

function deriveCreatorCategory(
  row: Pick<CinematicProjectRow, 'mode' | 'duration' | 'title' | 'prompt'>,
  niche: string
): string {
  const nicheLabel = niche
    ? niche.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : ''
  if (nicheLabel) return nicheLabel

  const mode = inferProjectMode(row)
  if (mode === 'director' || (row.duration ?? 0) > 90) return 'YouTube'
  return 'Instagram Reel'
}

function resolveProjectScenes(
  row: Pick<CinematicProjectRow, 'scenes' | 'storyboard'>
): CinematicScene[] {
  const fromScenes = Array.isArray(row.scenes) ? row.scenes : []
  const fromStoryboard = Array.isArray(row.storyboard) ? row.storyboard : []
  const raw = fromScenes.length > 0 ? fromScenes : fromStoryboard
  return sanitizeScenesFromPersistence(raw as CinematicScene[])
}

function resolveThumbnail(
  thumbnailUrl: string | null | undefined,
  scenes: CinematicScene[]
): string | null {
  if (thumbnailUrl?.trim()) return thumbnailUrl.trim()
  return firstSceneThumbnail(scenes)
}

function firstSceneThumbnail(scenes: CinematicScene[]): string | null {
  for (const scene of scenes) {
    const url =
      scene.storyboardImages?.find((img) => img.id === scene.activeStoryboardId)?.url ||
      scene.storyboardImages?.[0]?.url ||
      scene.imageUrl
    if (url?.trim()) return url.trim()
  }
  return null
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

/** Map a DB row to a sanitized showcase card (no user_id, voice URLs, or full script). */
export function rowToShowcaseProject(row: CinematicProjectRow): ShowcaseProject {
  const parsed = parseCaptionsPayload(row.captions as CaptionsPayload | string | null)
  const scenes = resolveProjectScenes(row)
  const hookPreview =
    parsed.hook?.trim() ||
    row.prompt?.trim().slice(0, 120) ||
    row.title?.trim() ||
    'Untitled hook'

  const description =
    parsed.summary?.trim() ||
    row.prompt?.trim() ||
    truncate(row.script || '', 160) ||
    ''

  const thumbnailUrl =
    resolveThumbnail(row.thumbnail_url, scenes) || firstSceneThumbnail(scenes)

  return {
    id: row.id,
    title: row.title?.trim() || 'Untitled project',
    category: deriveCreatorCategory(row, parsed.niche || ''),
    hookPreview: truncate(hookPreview, 200),
    thumbnailUrl,
    description: truncate(description, 220),
    updatedAt: row.updated_at,
  }
}
