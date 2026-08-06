import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'
import { generateV7SceneVideo } from '@/lib/v7/providers/video.server'
import type { V7VideoGenerationResult } from '@/lib/v7/providers/video-provider.types'
import {
  buildV7SceneVideoBundles,
  buildV7SceneVideoStoragePath,
  type V7SceneVideoBundle,
} from '@/lib/v7/video-prompt.server'
import type { V7CreativeBrief } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7CharacterBible } from '@/agents/v7/character-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'
import type { V7WorldBible } from '@/agents/v7/world-builder.server'

export type V7SceneVideoUpdate = {
  sceneId: string
  motionPresetId: string | null
  videoUrl: string
  videoProvider: string
  durationSec: number
}

function checkpointMatchesCurrentPrompt(
  archive: Record<string, unknown> | undefined,
  bundle: V7SceneVideoBundle
): boolean {
  if (!archive) return false
  const current = bundle.promptArchive
  return archive.action === current.action && archive.sceneNumber === current.sceneNumber
}

function validateSceneVideoQuality(params: {
  bundle: V7SceneVideoBundle
  result: V7VideoGenerationResult
}): void {
  const archive = params.result.metadata?.promptArchive as Record<string, unknown> | undefined
  const expected = params.bundle.promptArchive

  if (!archive?.action || archive.action !== expected.action) {
    throw new Error(`Scene ${params.bundle.sceneNumber}: video rejected — screenplay action mismatch`)
  }

  if (archive.continuityId && archive.continuityId !== expected.continuityId) {
    throw new Error(`Scene ${params.bundle.sceneNumber}: video rejected — continuity mismatch`)
  }

  if (Math.abs(params.result.durationSec - params.bundle.durationSec) > 3) {
    throw new Error(`Scene ${params.bundle.sceneNumber}: video rejected — duration mismatch`)
  }

  if (!params.result.videoUrl?.trim() || isEphemeralRemoteImageUrl(params.result.videoUrl)) {
    throw new Error(`Scene ${params.bundle.sceneNumber}: video rejected — not durably stored`)
  }
}

async function loadProductionBibles(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productionId: string
): Promise<{ characterBible: V7CharacterBible | null; worldBible: V7WorldBible | null }> {
  const { data: stages } = await supabase
    .from('v7_stages')
    .select('stage, output')
    .eq('production_id', productionId)

  const characterStage = stages?.find((row) => row.stage === 'character')
  const worldStage = stages?.find((row) => row.stage === 'world')
  return {
    characterBible: (characterStage?.output as { bible?: V7CharacterBible } | null)?.bible ?? null,
    worldBible: (worldStage?.output as { world?: V7WorldBible } | null)?.world ?? null,
  }
}

async function checkpointSceneVideo(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
  sceneId: string
  videoUrl: string
  thumbnailUrl: string
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
        videoUrl: params.videoUrl,
        videoThumbnailUrl: params.thumbnailUrl,
        videoMetadata: params.metadata,
        videoCheckpointAt: new Date().toISOString(),
        videoGenerationStatus: 'ready',
      },
    })
    .eq('id', params.sceneId)

  if (error) {
    throw new Error(`Scene video checkpoint failed: ${error.message}`)
  }
}

export async function runV7VideoOrchestrator(params: {
  brief: V7CreativeBrief
  direction: V7CreativeDirection
  script: V7ScriptDocument
  storyboard: V7StoryboardDocument
  scenes: Array<{ id: string; number: number; storyboard?: Record<string, unknown> }>
  productionId: string
}): Promise<{
  sceneUpdates: V7SceneVideoUpdate[]
  provider: string
  durationMs: number
}> {
  const started = Date.now()
  const supabase = await createSupabaseServerClient()

  const { data: production, error: prodError } = await supabase
    .from('v7_productions')
    .select('user_id')
    .eq('id', params.productionId)
    .maybeSingle()

  if (prodError || !production?.user_id) {
    throw new Error(prodError?.message ?? 'Production owner missing')
  }

  const userId = production.user_id as string
  const bibles = await loadProductionBibles(supabase, params.productionId)

  const { data: existingScenes } = await supabase
    .from('v7_scenes')
    .select('id, number, storyboard')
    .eq('production_id', params.productionId)

  const existingById = new Map<
    string,
    {
      videoUrl?: string
      videoMetadata?: Record<string, unknown>
      videoCheckpointAt?: string
      imageUrl?: string
    }
  >(
    (existingScenes ?? []).map((row) => [
      row.id as string,
      ((row.storyboard as Record<string, unknown> | null) ?? {}) as {
        videoUrl?: string
        videoMetadata?: Record<string, unknown>
        videoCheckpointAt?: string
        imageUrl?: string
      },
    ])
  )

  const bundles = buildV7SceneVideoBundles({
    ...params,
    ...bibles,
  })

  const sceneUpdates: V7SceneVideoUpdate[] = []
  let dominantProvider = 'unknown'

  for (const bundle of bundles) {
    if (!bundle.imageUrl?.trim()) {
      throw new Error(`Scene ${bundle.sceneNumber}: storyboard image required before video generation`)
    }

    const existing = existingById.get(bundle.sceneId)
    const existingVideo = existing?.videoUrl?.trim()
    const archive = existing?.videoMetadata?.promptArchive as Record<string, unknown> | undefined
    const hasCheckpoint = Boolean(existing?.videoCheckpointAt || existing?.videoMetadata)

    if (
      existingVideo &&
      !isEphemeralRemoteImageUrl(existingVideo) &&
      hasCheckpoint &&
      checkpointMatchesCurrentPrompt(archive, bundle)
    ) {
      sceneUpdates.push({
        sceneId: bundle.sceneId,
        motionPresetId: null,
        videoUrl: existingVideo,
        videoProvider: String(existing?.videoMetadata?.provider ?? 'checkpoint'),
        durationSec: Number(existing?.videoMetadata?.durationSec ?? bundle.durationSec),
      })
      dominantProvider = String(existing?.videoMetadata?.provider ?? dominantProvider)
      continue
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const storagePath = buildV7SceneVideoStoragePath({
          userId,
          productionId: params.productionId,
          sceneId: bundle.sceneId,
          attempt,
        })

        const result = await generateV7SceneVideo({
          prompt: bundle.prompt,
          negativePrompt: bundle.negativePrompt,
          imageUrl: bundle.imageUrl,
          aspectRatio: bundle.aspectRatio,
          width: bundle.width,
          height: bundle.height,
          durationSec: bundle.durationSec,
          seed: bundle.seed,
          sceneId: bundle.sceneId,
          sceneNumber: bundle.sceneNumber,
          productionId: params.productionId,
          userId,
          storagePath,
          continuityId: bundle.continuityId,
          consistencyModes: [...bundle.consistencyModes],
          promptArchive: bundle.promptArchive,
          cameraMovement: bundle.cameraMovement,
          narration: bundle.narration,
          dialogue: bundle.dialogue,
        })

        validateSceneVideoQuality({ bundle, result })

        if (result.provider === 'image-animation' || result.metadata?.fallback === true) {
          console.warn(
            '[V9_WARNING]',
            JSON.stringify({
              event: 'ken_burns_fallback_used',
              sceneNumber: bundle.sceneNumber,
              productionId: params.productionId,
              provider: result.provider,
              message:
                'All AI video providers failed — using Ken Burns animation as final fallback. Configure WAN_VIDEO_URL or other AI providers for true cinematic motion.',
            })
          )
        }

        await checkpointSceneVideo({
          supabase,
          sceneId: bundle.sceneId,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          metadata: {
            ...result.metadata,
            provider: result.provider,
            model: result.model,
            storagePath: result.storagePath,
            durationSec: result.durationSec,
            promptArchive: bundle.promptArchive,
            generationTimeMs: result.generationTimeMs,
            retries: result.retries,
          },
        })

        sceneUpdates.push({
          sceneId: bundle.sceneId,
          motionPresetId: null,
          videoUrl: result.videoUrl,
          videoProvider: result.provider,
          durationSec: result.durationSec,
        })
        dominantProvider = result.provider
        lastError = null
        break
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Scene video generation failed')
        console.error({
          stage: 'animation',
          sceneNumber: bundle.sceneNumber,
          productionId: params.productionId,
          attempt,
          message: lastError.message,
        })
      }
    }

    if (lastError) {
      throw lastError
    }
  }

  return {
    sceneUpdates,
    provider: dominantProvider,
    durationMs: Date.now() - started,
  }
}
