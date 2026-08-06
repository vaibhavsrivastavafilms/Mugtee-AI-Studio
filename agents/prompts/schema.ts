import { z } from 'zod'

export const promptMetadataSchema = z.object({
  camera: z.string().min(1),
  lens: z.string().min(1),
  lighting: z.string().min(1),
  movement: z.string().min(1),
  quality: z.string().min(1),
  style: z.string().min(1),
  aspectRatio: z.enum(['9:16', '16:9', '1:1', '4:5']),
  characterSeed: z.string().min(1).optional(),
  characterAppearance: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  consistencyReferences: z.array(z.string()).optional(),
})

export const scenePromptSchema = z.object({
  sceneId: z.string().uuid(),
  sceneNumber: z.number().int().min(1),
  imagePrompt: z.string().min(32),
  videoPrompt: z.string().min(32),
  negativePrompt: z.string().min(8),
  metadata: promptMetadataSchema,
})

export const scenePromptDocumentSchema = z.object({
  prompts: z.array(scenePromptSchema).min(1),
})

export type ScenePromptInput = z.infer<typeof scenePromptSchema>
export type PromptMetadataInput = z.infer<typeof promptMetadataSchema>

export function parseScenePromptDocument(raw: Record<string, unknown>) {
  return scenePromptDocumentSchema.parse(raw)
}

export function parseScenePrompt(prompt: unknown) {
  return scenePromptSchema.parse(prompt)
}
