import { z } from 'zod'

const exportSceneSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  imageAssetPath: z.string().optional().nullable(),
})

const exportClientSceneSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  imageAssetPath: z.string().optional().nullable(),
})

export const ExportRequestSchema = z.object({
  projectId: z.string().trim().min(1, 'projectId required'),
  quality: z.literal('1080p').optional().default('1080p'),
  includeVoiceover: z.boolean().optional().default(true),
  includeCaptions: z.boolean().optional().default(true),
  timelineJson: z.unknown().optional(),
  /** Optional client snapshot — merged before server readiness when DB row is stale */
  scenes: z.array(exportClientSceneSchema).optional(),
  storyboards: z.array(exportClientSceneSchema).optional(),
  script: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  captions: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  voiceover: z.string().optional().nullable(),
  voiceUrl: z.string().optional().nullable(),
})

export const ExportReadinessInputSchema = z.object({
  projectId: z.string().trim().optional().nullable(),
  script: z.string().optional().nullable(),
  voiceUrl: z.string().optional().nullable(),
  scenes: z.array(exportSceneSchema).min(1, 'At least one scene is required'),
})

export type ExportRequestPayload = z.infer<typeof ExportRequestSchema>
export type ExportReadinessInput = z.infer<typeof ExportReadinessInputSchema>

export type ExportValidationResult =
  | { ok: true; data: ExportReadinessInput }
  | { ok: false; message: string; issues: string[] }

export function validateExportReadinessInput(input: {
  projectId?: string | null
  script?: string | null
  voiceUrl?: string | null
  scenes: Array<{ id: string; title?: string | null; imageUrl?: string | null; imageAssetPath?: string | null }>
}): ExportValidationResult {
  const parsed = ExportReadinessInputSchema.safeParse(input)
  if (parsed.success) {
    return { ok: true, data: parsed.data }
  }
  const issues = parsed.error.issues.map((issue) => issue.message)
  return {
    ok: false,
    message: issues[0] ?? 'Project data incomplete',
    issues,
  }
}

export function validateExportRequestPayload(
  payload: unknown
):
  | { ok: true; data: ExportRequestPayload }
  | { ok: false; message: string; fieldErrors: ReturnType<z.ZodError['flatten']> } {
  const parsed = ExportRequestSchema.safeParse(payload)
  if (parsed.success) return { ok: true, data: parsed.data }
  const message = parsed.error.issues[0]?.message ?? 'Invalid export payload'
  return { ok: false, message, fieldErrors: parsed.error.flatten() }
}

export type SafeExportSceneRow = {
  id: string
  title?: string | null
  imageUrl?: string | null
  imageAssetPath?: string | null
}

/** Normalize client snapshot arrays — never treat malformed entries as valid scenes. */
export function safeExportSceneRows(raw: unknown): SafeExportSceneRow[] {
  if (!Array.isArray(raw)) return []
  const out: SafeExportSceneRow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    if (!id) continue
    out.push({
      id,
      title: typeof row.title === 'string' ? row.title : null,
      imageUrl: typeof row.imageUrl === 'string' ? row.imageUrl : null,
      imageAssetPath: typeof row.imageAssetPath === 'string' ? row.imageAssetPath : null,
    })
  }
  return out
}

export function summarizeExportPayload(data: ExportRequestPayload): {
  projectId: string
  sceneCount: number
  storyboardCount: number
  captionCount: number
  hasVoice: boolean
  hasThumbnail: boolean
  quality: string
} {
  const safeScenes = safeExportSceneRows(data.scenes)
  const safeStoryboards = safeExportSceneRows(data.storyboards)
  const captionParts: string[] = []
  if (typeof data.caption === 'string' && data.caption.trim()) captionParts.push(data.caption.trim())
  if (Array.isArray(data.captions)) {
    for (const c of data.captions) {
      if (typeof c === 'string' && c.trim()) captionParts.push(c.trim())
    }
  } else if (typeof data.captions === 'string' && data.captions.trim()) {
    captionParts.push(data.captions.trim())
  }
  const voiceUrl = (data.voiceUrl ?? data.voiceover)?.trim()
  const thumb = (data.thumbnailUrl ?? data.thumbnail)?.trim()
  return {
    projectId: data.projectId,
    sceneCount: safeScenes.length,
    storyboardCount: safeStoryboards.length,
    captionCount: captionParts.length,
    hasVoice: Boolean(voiceUrl),
    hasThumbnail: Boolean(thumb),
    quality: data.quality ?? '1080p',
  }
}

/** Reject structurally invalid export bodies before DB / backfill work. */
export function validateExportPayloadStructure(
  data: ExportRequestPayload
): { ok: true } | { ok: false; message: string; issues: string[] } {
  const issues: string[] = []
  if (!data.projectId?.trim()) issues.push('projectId is required')

  const safeScenes = safeExportSceneRows(data.scenes)
  const safeStoryboards = safeExportSceneRows(data.storyboards)
  if (data.scenes != null && !Array.isArray(data.scenes)) {
    issues.push('scenes must be an array when provided')
  }
  if (data.storyboards != null && !Array.isArray(data.storyboards)) {
    issues.push('storyboards must be an array when provided')
  }
  if (Array.isArray(data.scenes) && data.scenes.length > 0 && safeScenes.length < 1) {
    issues.push('scenes entries must include a non-empty id')
  }
  if (Array.isArray(data.storyboards) && data.storyboards.length > 0 && safeStoryboards.length < 1) {
    issues.push('storyboards entries must include a non-empty id')
  }

  const voiceRaw = data.voiceUrl ?? data.voiceover
  if (voiceRaw != null && typeof voiceRaw !== 'string') {
    issues.push('voiceUrl must be a string when provided')
  }

  if (issues.length > 0) {
    return { ok: false, message: issues[0]!, issues }
  }
  return { ok: true }
}
