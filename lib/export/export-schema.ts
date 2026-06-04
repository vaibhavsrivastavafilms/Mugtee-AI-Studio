import { z } from 'zod'

const exportSceneSchema = z.object({
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
): { ok: true; data: ExportRequestPayload } | { ok: false; message: string } {
  const parsed = ExportRequestSchema.safeParse(payload)
  if (parsed.success) return { ok: true, data: parsed.data }
  const message = parsed.error.issues[0]?.message ?? 'Invalid export payload'
  return { ok: false, message }
}
