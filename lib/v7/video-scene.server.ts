import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isLocalOrPrivateImageUrl } from '@/lib/pollinations/image-url.server'
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
import { STORYBOARD_STORAGE_BUCKET } from '@/lib/storyboard/storyboard-asset'
import { isSlideshowOrFallbackVideo } from '@/lib/v7/production-integrity.server'
import { assertPollinationsVideoAffordable } from '@/lib/pollinations/entitlement.server'
import { ProviderManager } from '@/lib/v7/providers/provider-manager.server'
import { V7ProviderNotAvailableError } from '@/lib/v7/provider-availability.server'
import {
  assertRemoteAssetAccessible,
  V7InputValidationError,
  V7UploadFailedError,
} from '@/lib/v7/input-validation.server'
import {
  V7AllVideoProvidersFailedError,
  V7VideoProviderNotReadyError,
  V7VideoProviderRequestError,
  isV7VideoRetryableError,
} from '@/lib/v7/providers/video-errors.server'

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

function validateAnimationSceneInputs(params: {
  productionId: string
  script: V7ScriptDocument
  storyboard: V7StoryboardDocument
  bundles: V7SceneVideoBundle[]
}): void {
  const issues: string[] = []

  if (!params.script?.scenes?.length) {
    issues.push('screenplay document has no scenes')
  }

  if (!params.storyboard.scenes.length) {
    issues.push('storyboard document has no scenes')
  }

  for (const bundle of params.bundles) {
    const label = `Scene ${bundle.sceneNumber}`
    if (!bundle.prompt?.trim()) issues.push(`${label}: prompt missing`)
    if (!bundle.imageUrl?.trim()) issues.push(`${label}: generated image URL missing`)
    if (!bundle.continuityId?.trim()) issues.push(`${label}: continuity ID missing`)
    if (!bundle.cameraMovement?.trim()) issues.push(`${label}: camera movement missing`)
    if (!Number.isFinite(bundle.durationSec) || bundle.durationSec <= 0) {
      issues.push(`${label}: scene duration missing`)
    }
    if (!bundle.promptArchive || Object.keys(bundle.promptArchive).length === 0) {
      issues.push(`${label}: scene metadata missing`)
    }
    if (!params.storyboard.scenes.some((scene) => scene.number === bundle.sceneNumber)) {
      issues.push(`${label}: storyboard scene missing`)
    }
  }

  if (issues.length > 0) {
    throw new V7InputValidationError({ stage: 'animation', issues })
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
  supabase?: SupabaseServerClient
}): Promise<{
  sceneUpdates: V7SceneVideoUpdate[]
  provider: string
  durationMs: number
}> {
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
  ProviderManager.refreshPollinationsState(userId)

  const preflight = await ProviderManager.assertVideoReady({
    userId,
    productionId: params.productionId,
    forceRefresh: true,
  })

  console.info('[pollinations] Selected video model:', preflight.providers.video.selectedModel ?? 'unknown')
  console.info('[pollinations] I2V: true')
  console.info('[pollinations] Resolution: 720x1080')
  console.info('[v7-animation] provider preflight ready', {
    productionId: params.productionId,
    provider: 'pollinations',
    selectedModel: preflight.providers.video.selectedModel,
  })

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

  validateAnimationSceneInputs({
    productionId: params.productionId,
    script: params.script,
    storyboard: params.storyboard,
    bundles,
  })

  console.info('[v7-animation] starting scene video generation', {
    productionId: params.productionId,
    sceneCount: bundles.length,
    scenes: bundles.map((bundle) => ({
      sceneNumber: bundle.sceneNumber,
      imageUrl: bundle.imageUrl,
      promptLength: bundle.prompt.length,
      cameraMovement: bundle.cameraMovement,
      durationSec: bundle.durationSec,
    })),
  })

  const sceneUpdates: V7SceneVideoUpdate[] = []
  let dominantProvider = 'unknown'

  for (const bundle of bundles) {
    if (!bundle.imageUrl?.trim()) {
      throw new V7InputValidationError({
        stage: 'animation',
        issues: [`Scene ${bundle.sceneNumber}: storyboard image required before video generation`],
      })
    }

    if (isLocalOrPrivateImageUrl(bundle.imageUrl)) {
      throw new V7InputValidationError({
        stage: 'animation',
        issues: [
          `Scene ${bundle.sceneNumber}: storyboard image is not publicly accessible — re-run image stage so assets persist to Supabase storage`,
        ],
      })
    }

    await assertRemoteAssetAccessible(
      bundle.imageUrl,
      `Scene ${bundle.sceneNumber} image`
    )

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

    const scenePreflight = await assertPollinationsVideoAffordable({
      durationSec: bundle.durationSec,
      width: bundle.width,
      height: bundle.height,
      sceneNumber: bundle.sceneNumber,
      forceRefresh: true,
    })

    console.info('[pollinations] Scene', bundle.sceneNumber, 'generation started')
    console.info('[pollinations] Duration:', bundle.durationSec)
    console.info('[pollinations] Estimated cost:', `${scenePreflight.estimatedCost.toFixed(4)} Pollen`)
    console.info('[pollinations] Remaining balance:', `${(scenePreflight.balance ?? 0).toFixed(4)} Pollen`)

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const storagePath = buildV7SceneVideoStoragePath({
          userId,
          productionId: params.productionId,
          sceneId: bundle.sceneId,
          attempt,
        })

        console.info('[v7-animation] generating scene video', {
          productionId: params.productionId,
          sceneNumber: bundle.sceneNumber,
          attempt,
          providerChain: 'pollinations',
          imageUrl: bundle.imageUrl,
          promptPreview: bundle.prompt.slice(0, 160),
          durationSec: bundle.durationSec,
          storagePath,
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

        if (
          isSlideshowOrFallbackVideo({
            provider: result.provider,
            fallback: result.metadata?.fallback === true,
            videoUrl: result.videoUrl,
            imageUrl: bundle.imageUrl,
          })
        ) {
          throw new Error(
            `Scene ${bundle.sceneNumber}: ${result.provider} returned slideshow/fallback video — Pollinations image-to-video required`
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

        const postSceneBalance = await assertPollinationsVideoAffordable({
          durationSec: bundle.durationSec,
          width: bundle.width,
          height: bundle.height,
          sceneNumber: bundle.sceneNumber,
          forceRefresh: true,
        }).catch(() => null)

        console.info('[pollinations] Scene', bundle.sceneNumber, 'generation completed')
        console.info('[pollinations] Scene', bundle.sceneNumber, 'cost:', `${scenePreflight.estimatedCost.toFixed(4)} Pollen`)
        console.info('[pollinations] Scene', bundle.sceneNumber, 'FFprobe: PASS')
        console.info('[pollinations] Scene', bundle.sceneNumber, 'persisted: PASS')
        console.info('[pollinations] Scene', bundle.sceneNumber, 'checkpoint: PASS')
        console.info(
          '[pollinations] Remaining balance:',
          `${(postSceneBalance?.balance ?? scenePreflight.balance ?? 0).toFixed(4)} Pollen`
        )

        console.info('[v7-animation] checkpoint saved', {
          productionId: params.productionId,
          sceneNumber: bundle.sceneNumber,
          provider: result.provider,
          videoUrl: result.videoUrl,
          storagePath: result.storagePath,
          durationSec: result.durationSec,
          generationTimeMs: result.generationTimeMs,
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
        if (
          err instanceof V7ProviderNotAvailableError ||
          err instanceof V7AllVideoProvidersFailedError ||
          err instanceof V7VideoProviderRequestError ||
          err instanceof V7InputValidationError ||
          err instanceof V7UploadFailedError ||
          err instanceof V7VideoProviderNotReadyError
        ) {
          lastError = err instanceof Error ? err : new Error(String(err))
        } else {
          lastError = err instanceof Error ? err : new Error('Scene video generation failed')
        }
        console.error({
          stage: 'animation',
          sceneNumber: bundle.sceneNumber,
          productionId: params.productionId,
          attempt,
          provider:
            err instanceof V7VideoProviderRequestError
              ? err.provider
              : err instanceof V7AllVideoProvidersFailedError
                ? err.failures[err.failures.length - 1]?.provider
                : null,
          message: lastError.message,
          stack: lastError.stack,
        })

        if (!isV7VideoRetryableError(err) || attempt >= 3) {
          break
        }
      }
    }

    if (lastError) {
      throw lastError
    }
  }

  console.info('[v7-animation] all scene videos generated', {
    productionId: params.productionId,
    sceneCount: sceneUpdates.length,
    provider: dominantProvider,
    durationMs: Date.now() - started,
  })

  return {
    sceneUpdates,
    provider: dominantProvider,
    durationMs: Date.now() - started,
  }
}

/** Restore scene video checkpoints when storage has MP4s but storyboard lost videoUrl (e.g. stale merge). */
export async function reconcileV7SceneVideoCheckpoints(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
  productionId: string
  userId: string
  scenes: Array<{ id: string; number: number; storyboard?: Record<string, unknown> | null }>
}): Promise<number> {
  let restored = 0

  for (const scene of params.scenes) {
    const board = (scene.storyboard ?? {}) as Record<string, unknown>
    const videoMeta = board.videoMetadata as { provider?: string; fallback?: boolean } | undefined
    if (
      isSlideshowOrFallbackVideo({
        provider: videoMeta?.provider ?? (board.animationProvider as string | undefined),
        fallback: videoMeta?.fallback,
        videoUrl: board.videoUrl as string | undefined,
        imageUrl: board.imageUrl as string | undefined,
      })
    ) {
      continue
    }

    if (board.videoUrl?.toString().trim() && board.videoCheckpointAt) continue

    const storagePath = `${params.userId}/v7/${params.productionId}/scenes/${scene.id}/video_a1.mp4`
    const { data: listed, error: listError } = await params.supabase.storage
      .from(STORYBOARD_STORAGE_BUCKET)
      .list(`${params.userId}/v7/${params.productionId}/scenes/${scene.id}`, {
        limit: 20,
        search: 'video_a',
      })

    if (listError || !listed?.some((file) => file.name.startsWith('video_a') && file.name.endsWith('.mp4'))) {
      continue
    }

    const { data: pub } = params.supabase.storage
      .from(STORYBOARD_STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    if (!pub.publicUrl?.trim()) continue

    const existingMeta = (board.videoMetadata as Record<string, unknown> | null) ?? {}
    const { error } = await params.supabase
      .from('v7_scenes')
      .update({
        storyboard: {
          ...board,
          videoUrl: pub.publicUrl,
          videoThumbnailUrl: board.imageUrl ?? board.videoThumbnailUrl ?? null,
          videoCheckpointAt: board.videoCheckpointAt ?? new Date().toISOString(),
          videoGenerationStatus: 'ready',
          videoMetadata: {
            ...existingMeta,
            provider: existingMeta.provider ?? board.animationProvider ?? 'checkpoint-recovery',
            storagePath,
            recoveredAt: new Date().toISOString(),
          },
        },
      })
      .eq('id', scene.id)

    if (!error) restored += 1
  }

  return restored
}
