import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ImageAgentSceneResult } from '@/agents/image/run.server'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'
import {
  buildV7ScenePromptBundles,
  buildV7SceneStoragePath,
  validateV7SceneImagePrompt,
  type V7ScenePromptBundle,
} from '@/lib/v7/image-prompt.server'
import { V7ImagePromptValidationError } from '@/lib/v7/providers/image-errors.server'
import { generateV7SceneImage } from '@/lib/v7/providers/image.server'
import type { V7ImageGenerationResult } from '@/lib/v7/providers/image-provider.types'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7CharacterBible } from '@/agents/v7/character-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'
import type { V7WorldBible } from '@/agents/v7/world-builder.server'

function validateV7SceneImageResult(params: {
  bundle: V7ScenePromptBundle
  result: V7ImageGenerationResult
}): void {
  const { bundle, result } = params

  if (!result.imageUrl?.trim()) {
    throw new Error(`Scene ${bundle.sceneNumber}: image URL missing`)
  }
  if (isEphemeralRemoteImageUrl(result.imageUrl)) {
    throw new Error(`Scene ${bundle.sceneNumber}: ephemeral image URL rejected`)
  }
  if (!result.storagePath?.trim()) {
    throw new Error(`Scene ${bundle.sceneNumber}: storage path missing`)
  }
  if (result.width < 256 || result.height < 256) {
    throw new Error(`Scene ${bundle.sceneNumber}: invalid resolution ${result.width}x${result.height}`)
  }
  if (result.width !== bundle.width || result.height !== bundle.height) {
    // Allow provider rounding but reject extreme mismatch
    const ratioExpected = bundle.width / bundle.height
    const ratioActual = result.width / result.height
    if (Math.abs(ratioExpected - ratioActual) > 0.15) {
      throw new Error(`Scene ${bundle.sceneNumber}: aspect ratio mismatch`)
    }
  }
}

async function checkpointSceneImage(params: {
  supabase: SupabaseServerClient
  sceneId: string
  imageUrl: string
  metadata: Record<string, unknown>
}): Promise<void> {
  const { data: scene } = await params.supabase
    .from('v7_scenes')
    .select('storyboard')
    .eq('id', params.sceneId)
    .maybeSingle()

  const storyboard = (scene?.storyboard as Record<string, unknown> | null) ?? {}

  const { error } = await params.supabase
    .from('v7_scenes')
    .update({
      storyboard: {
        ...storyboard,
        imageUrl: params.imageUrl,
        thumbnailUrl: params.imageUrl,
        imageMetadata: params.metadata,
        imageCheckpointAt: new Date().toISOString(),
      },
    })
    .eq('id', params.sceneId)

  if (error) {
    throw new Error(`Scene checkpoint failed: ${error.message}`)
  }
}

export async function runV7ImageOrchestrator(params: {
  brief: V7CreativeBrief
  direction: V7CreativeDirection
  script: V7ScriptDocument
  storyboard: V7StoryboardDocument
  scenes: Array<{ id: string; number: number }>
  productionId: string
  characterBible?: V7CharacterBible | null
  worldBible?: V7WorldBible | null
  supabase?: SupabaseServerClient
  forceRegenerate?: boolean
}): Promise<{ images: ImageAgentSceneResult[]; durationMs: number }> {
  const started = Date.now()
  const supabase = params.supabase ?? (await createSupabaseServerClient())

  const { data: production, error: prodError } = await supabase
    .from('v7_productions')
    .select('user_id')
    .eq('id', params.productionId)
    .maybeSingle()

  if (prodError || !production?.user_id) {
    throw new Error(prodError?.message ?? 'Production owner missing')
  }

  const userId = production.user_id as string

  const { data: existingScenes } = await supabase
    .from('v7_scenes')
    .select('id, number, storyboard')
    .eq('production_id', params.productionId)

  type ExistingSceneImage = {
    imageUrl?: string
    imageMetadata?: Record<string, unknown>
    imageCheckpointAt?: string
  }

  const existingById = new Map<string, ExistingSceneImage>(
    (existingScenes ?? []).map((row) => [
      row.id as string,
      ((row.storyboard as ExistingSceneImage | null) ?? {}) as ExistingSceneImage,
    ])
  )

  /** Matches validateImageStageComplete — URL alone is not completion evidence. */
  function hasPersistedImageCheckpoint(existing: ExistingSceneImage | undefined): boolean {
    if (!existing?.imageCheckpointAt?.trim()) return false
    if (!existing.imageMetadata || typeof existing.imageMetadata !== 'object') return false

    const meta = existing.imageMetadata as {
      storagePath?: string
      promptArchive?: { action?: string }
    }
    if (!meta.storagePath?.trim()) return false
    if (!meta.promptArchive?.action?.trim()) return false

    return true
  }

  const bundles = buildV7ScenePromptBundles({
    brief: params.brief,
    direction: params.direction,
    script: params.script,
    storyboard: params.storyboard,
    scenes: params.scenes,
    productionId: params.productionId,
    characterBible: params.characterBible,
    worldBible: params.worldBible,
  })

  function checkpointMatchesCurrentPrompt(
    archive: Record<string, unknown> | undefined,
    bundle: V7ScenePromptBundle
  ): boolean {
    if (!archive) return false
    const current = bundle.promptArchive
    return (
      archive.action === current.action &&
      archive.location === current.location &&
      archive.sceneNumber === current.sceneNumber &&
      JSON.stringify(archive.characters ?? []) === JSON.stringify(current.characters ?? []) &&
      archive.promptScore === current.promptScore
    )
  }

  function shouldReuseExistingImage(bundle: V7ScenePromptBundle): boolean {
    if (params.forceRegenerate) return false

    const existing = existingById.get(bundle.sceneId)
    const existingUrl = existing?.imageUrl?.trim()
    if (!existingUrl || isEphemeralRemoteImageUrl(existingUrl)) return false
    if (!hasPersistedImageCheckpoint(existing)) return false

    const archive = existing?.imageMetadata?.promptArchive as Record<string, unknown> | undefined
    if (!checkpointMatchesCurrentPrompt(archive, bundle)) return false

    // Reuse only fully checkpointed scenes — placeholders without metadata must regenerate.
    return true
  }

  function sceneNeedsGeneration(bundle: V7ScenePromptBundle): boolean {
    return !shouldReuseExistingImage(bundle)
  }

  for (const bundle of bundles) {
    if (!sceneNeedsGeneration(bundle)) continue

    const validation = validateV7SceneImagePrompt({
      spec: bundle.spec,
      prompt: bundle.prompt,
      negativePrompt: bundle.negativePrompt,
      characterBible: params.characterBible,
    })

    if (!validation.valid) {
      throw new V7ImagePromptValidationError({
        sceneNumber: bundle.sceneNumber,
        missingRequirements: validation.missingRequirements,
        forbiddenTermsFound: validation.forbiddenTermsFound,
        finalPrompt: validation.finalPrompt,
        negativePrompt: validation.negativePrompt,
        score: validation.score.overall,
      })
    }
  }

  const results: ImageAgentSceneResult[] = []

  for (const bundle of bundles) {
    const existing = existingById.get(bundle.sceneId)
    const existingUrl = existing?.imageUrl?.trim()

    if (shouldReuseExistingImage(bundle)) {
      const reusedUrl = existingUrl!
      results.push({
        sceneId: bundle.sceneId,
        sceneNumber: bundle.sceneNumber,
        attempts: 0,
        row: {
          project_id: params.productionId,
          scene_id: bundle.sceneId,
          prompt_id: `v7-prompt-${bundle.sceneNumber}`,
          provider: 'checkpoint',
          provider_job_id: null,
          image_url: reusedUrl,
          thumbnail_url: reusedUrl,
          seed: bundle.seed,
          width: bundle.width,
          height: bundle.height,
          generation_time_ms: 0,
          status: 'completed',
          metadata: {
            resumed: true,
            promptArchive: bundle.promptArchive,
          },
        },
      })
      continue
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const storagePath = buildV7SceneStoragePath({
          userId,
          productionId: params.productionId,
          sceneId: bundle.sceneId,
          attempt,
        })

        const result = await generateV7SceneImage({
          prompt: bundle.prompt,
          negativePrompt: bundle.negativePrompt,
          aspectRatio: bundle.aspectRatio,
          width: bundle.width,
          height: bundle.height,
          seed: bundle.seed,
          sceneId: bundle.sceneId,
          sceneNumber: bundle.sceneNumber,
          productionId: params.productionId,
          userId,
          storagePath,
          consistencyModes: [...bundle.consistencyModes],
          promptArchive: bundle.promptArchive,
        })

        validateV7SceneImageResult({ bundle, result })

        await checkpointSceneImage({
          supabase,
          sceneId: bundle.sceneId,
          imageUrl: result.imageUrl,
          metadata: {
            ...result.metadata,
            provider: result.provider,
            model: result.model,
            seed: result.seed,
            storagePath: result.storagePath,
            promptArchive: bundle.promptArchive,
            generationTimeMs: result.generationTimeMs,
            retries: result.retries,
          },
        })

        results.push({
          sceneId: bundle.sceneId,
          sceneNumber: bundle.sceneNumber,
          attempts: attempt,
          row: {
            project_id: params.productionId,
            scene_id: bundle.sceneId,
            prompt_id: `v7-prompt-${bundle.sceneNumber}`,
            provider: result.provider,
            provider_job_id: null,
            image_url: result.imageUrl,
            thumbnail_url: result.thumbnailUrl,
            seed: result.seed,
            width: result.width,
            height: result.height,
            generation_time_ms: result.generationTimeMs,
            status: 'completed',
            metadata: {
              ...result.metadata,
              promptArchive: bundle.promptArchive,
              storagePath: result.storagePath,
              attempt,
            },
          },
        })

        lastError = null
        break
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Image generation failed')
        console.error({
          stage: 'image',
          sceneNumber: bundle.sceneNumber,
          productionId: params.productionId,
          attempt,
          message: lastError.message,
          stack: lastError.stack,
        })
      }
    }

    if (lastError) {
      throw lastError
    }
  }

  return {
    images: results,
    durationMs: Date.now() - started,
  }
}
