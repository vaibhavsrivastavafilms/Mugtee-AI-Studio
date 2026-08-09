import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { fetchLivePollinationsFullCatalog } from '@/lib/pollinations/catalog-live.server'
import { resolvePollinationsSpendableBalance } from '@/lib/pollinations/entitlement.server'
import { PollinationsError } from '@/lib/pollinations/errors.server'
import {
  estimatePollenForImageRequest,
  selectCheapestPollinationsImageModel,
} from '@/lib/pollinations/video-estimate-core'
import {
  buildV7ScenePromptBundles,
  buildV7SceneStoragePath,
  validateV7SceneImagePrompt,
} from '@/lib/v7/image-prompt.server'
import { previewV7ImagePromptsForSnapshot } from '@/lib/v7/image-prompt-audit.server'
import { generateV7SceneImage } from '@/lib/v7/providers/image.server'
import { V7ImagePromptValidationError } from '@/lib/v7/providers/image-errors.server'
import { loadV7StageBibles } from '@/lib/v7/scene-package.server'
import {
  assertPriorSceneApproved,
  checkPollenSpendAllowed,
  mergeSafeExecutionState,
  readSafeExecutionState,
  type V7SafeExecutionCliArgs,
} from '@/lib/v7/safe-execution-core'
import {
  formatSceneImageInspectionReport,
  inspectGeneratedSceneImage,
} from '@/lib/v7/safe-execution-image-inspection.server'
import type { V7ProductionSnapshot } from '@/types/v7/production'

export type V7SafeImageEstimate = {
  modelId: string
  modelTitle: string
  estimatedCostPollen: number
  spendablePollen: number | null
  projectedBalancePollen: number | null
}

async function loadProductionContext(snapshot: V7ProductionSnapshot) {
  const brief = snapshot.production.creative_brief
  if (!brief) throw new Error('Creative brief missing')

  const scriptStage = snapshot.stages.find((row) => row.stage === 'script')
  const storyboardStage = snapshot.stages.find((row) => row.stage === 'storyboard')
  const script = (scriptStage?.output as { script?: unknown } | null)?.script
  const storyboard = (storyboardStage?.output as { storyboard?: unknown } | null)?.storyboard
  if (!script || !storyboard) throw new Error('Script or storyboard missing')

  const bibles = loadV7StageBibles(snapshot)
  if (!bibles.direction) throw new Error('Creative direction missing')

  return { brief, script, storyboard, bibles }
}

export async function estimateV7SafeSceneImageCost(params: {
  width: number
  height: number
}): Promise<V7SafeImageEstimate> {
  const catalog = await fetchLivePollinationsFullCatalog()
  const pick = selectCheapestPollinationsImageModel({
    catalog: catalog.imageEntries,
    width: params.width,
    height: params.height,
  })

  const estimatedCostPollen = pick ? estimatePollenForImageRequest(pick.pricing) : 0.004
  const balance = await resolvePollinationsSpendableBalance()
  const spendablePollen = balance.spendable
  const projectedBalancePollen =
    spendablePollen != null ? Math.max(0, spendablePollen - estimatedCostPollen) : null

  return {
    modelId: pick?.model.id ?? 'unknown',
    modelTitle: pick?.model.title ?? 'unknown',
    estimatedCostPollen,
    spendablePollen,
    projectedBalancePollen,
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

function formatRequiredList(values: string[]): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- —'
}

export async function runV7SafeSceneImageGeneration(params: {
  supabase: SupabaseServerClient
  snapshot: V7ProductionSnapshot
  userId: string
  args: V7SafeExecutionCliArgs
}): Promise<{ exitCode: number; output: string }> {
  const { snapshot, supabase, userId, args } = params
  const sceneRow = snapshot.scenes.find((scene) => scene.number === args.sceneNumber)
  if (!sceneRow) throw new Error(`Scene ${args.sceneNumber} not found`)

  const safeState = readSafeExecutionState(
    snapshot.production.timeline_json as Record<string, unknown> | null
  )
  assertPriorSceneApproved(safeState, args.sceneNumber)

  const existingGeneration = safeState.generations[String(args.sceneNumber)]
  if (existingGeneration && !args.force) {
    throw new Error(
      `Scene ${args.sceneNumber} already generated via safe execution — use --force to replace or approve first`
    )
  }

  const preview = previewV7ImagePromptsForSnapshot(snapshot)
  const previewRow = preview.rows.find((row) => row.sceneNumber === args.sceneNumber)
  if (!previewRow || previewRow.status !== 'PASS') {
    throw new Error(`IMAGE_PROMPT_VALIDATION_FAILED for scene ${args.sceneNumber}`)
  }

  const { brief, script, storyboard, bibles } = await loadProductionContext(snapshot)
  const bundles = buildV7ScenePromptBundles({
    brief,
    direction: bibles.direction!,
    script: script as never,
    storyboard: storyboard as never,
    scenes: [{ id: sceneRow.id, number: sceneRow.number }],
    productionId: snapshot.production.id,
    characterBible: bibles.characterBible,
    worldBible: bibles.worldBible,
  })
  const bundle = bundles[0]
  if (!bundle) throw new Error('Prompt bundle missing')

  const validation = validateV7SceneImagePrompt({
    spec: bundle.spec,
    prompt: bundle.prompt,
    negativePrompt: bundle.negativePrompt,
    characterBible: bibles.characterBible,
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

  const estimate = await estimateV7SafeSceneImageCost({
    width: bundle.width,
    height: bundle.height,
  })

  const spendCheck = checkPollenSpendAllowed({
    estimatedCost: estimate.estimatedCostPollen,
    maxPollen: args.maxPollen,
    availableBalance: estimate.spendablePollen,
  })

  const lines: string[] = []
  lines.push('SAFE EXECUTION')
  lines.push('')
  lines.push(`Production:`)
  lines.push(snapshot.production.id)
  lines.push('')
  lines.push(`Scene:`)
  lines.push(`${args.sceneNumber} / ${preview.sceneCount}`)
  lines.push('')
  lines.push('Generation:')
  lines.push('IMAGE ONLY')
  lines.push('')
  lines.push('Provider:')
  lines.push('Pollinations')
  lines.push('')
  lines.push('Model:')
  lines.push(`${estimate.modelTitle} (${estimate.modelId})`)
  lines.push('')
  lines.push('Prompt score:')
  lines.push(`${validation.score.overall}/100`)
  lines.push('')
  lines.push('Required:')
  lines.push(formatRequiredList([
    previewRow.required.subject,
    previewRow.required.action,
    previewRow.required.objects,
    previewRow.required.location,
  ]))
  lines.push('')
  lines.push('Forbidden:')
  lines.push(formatRequiredList([
    ...previewRow.forbidden.characters,
    ...previewRow.forbidden.locations,
    ...previewRow.forbidden.objects,
    ...previewRow.forbidden.concepts.slice(0, 8),
  ]))
  lines.push('')
  lines.push('Estimated cost:')
  lines.push(`${estimate.estimatedCostPollen.toFixed(4)} Pollen`)
  lines.push('')
  lines.push('Current balance:')
  lines.push(
    estimate.spendablePollen != null ? `${estimate.spendablePollen.toFixed(4)} Pollen` : 'UNKNOWN'
  )
  lines.push('')
  lines.push('Projected balance:')
  lines.push(
    estimate.projectedBalancePollen != null
      ? `${estimate.projectedBalancePollen.toFixed(4)} Pollen`
      : 'UNKNOWN'
  )
  lines.push('')

  if (!spendCheck.allowed) {
    lines.push('Proceeding:')
    lines.push('NO — POLLEN_SPEND_BLOCKED')
    lines.push('')
    lines.push('POLLEN_SPEND_BLOCKED')
    lines.push(JSON.stringify(spendCheck, null, 2))
    return { exitCode: 1, output: lines.join('\n') }
  }

  lines.push('Proceeding:')
  lines.push(`YES — SCENE ${args.sceneNumber} ONLY`)
  lines.push('')
  lines.push('FINAL IMAGE PROMPT:')
  lines.push(bundle.prompt)
  lines.push('')
  lines.push('NEGATIVE PROMPT:')
  lines.push(bundle.negativePrompt)
  lines.push('')

  const storagePath = buildV7SceneStoragePath({
    userId,
    productionId: snapshot.production.id,
    sceneId: bundle.sceneId,
    attempt: 1,
  })

  let result
  try {
    result = await generateV7SceneImage({
      prompt: bundle.prompt,
      negativePrompt: bundle.negativePrompt,
      aspectRatio: bundle.aspectRatio,
      width: bundle.width,
      height: bundle.height,
      seed: bundle.seed,
      sceneId: bundle.sceneId,
      sceneNumber: bundle.sceneNumber,
      productionId: snapshot.production.id,
      userId,
      storagePath,
      consistencyModes: [...bundle.consistencyModes],
      promptArchive: bundle.promptArchive,
      maxAttempts: 1,
      model: estimate.modelId !== 'unknown' ? estimate.modelId : undefined,
    })
  } catch (err) {
    if (err instanceof PollinationsError) {
      lines.push('Generation:')
      lines.push('FAILED')
      lines.push('')
      lines.push(`Provider error: ${err.code}`)
      lines.push(err.message)
      return { exitCode: 1, output: lines.join('\n') }
    }
    throw err
  }

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
      safeExecution: true,
      estimatedCostPollen: estimate.estimatedCostPollen,
    },
  })

  const postBalance = await resolvePollinationsSpendableBalance()
  const remaining =
    postBalance.spendable != null
      ? Math.max(0, postBalance.spendable)
      : estimate.projectedBalancePollen

  const timeline = mergeSafeExecutionState(
    snapshot.production.timeline_json as Record<string, unknown> | null,
    {
      generations: {
        [String(args.sceneNumber)]: {
          generatedAt: new Date().toISOString(),
          imageUrl: result.imageUrl,
          estimatedCostPollen: estimate.estimatedCostPollen,
          model: estimate.modelId,
          promptScore: validation.score.overall,
        },
      },
    }
  )

  const { error: timelineError } = await supabase
    .from('v7_productions')
    .update({ timeline_json: timeline })
    .eq('id', snapshot.production.id)

  if (timelineError) {
    throw new Error(`Failed to record safe execution state: ${timelineError.message}`)
  }

  const inspection = await inspectGeneratedSceneImage({
    imageUrl: result.imageUrl,
    spec: bundle.spec,
    sceneNumber: args.sceneNumber,
  })

  lines.push('IMAGE GENERATED')
  lines.push('')
  lines.push('Scene:')
  lines.push(String(args.sceneNumber))
  lines.push('')
  lines.push('Actual image:')
  lines.push(result.imageUrl)
  lines.push('')
  lines.push('Pollen estimate:')
  lines.push(`${estimate.estimatedCostPollen.toFixed(4)}`)
  lines.push('')
  lines.push('Generation:')
  lines.push('SUCCESS')
  lines.push('')
  lines.push('Remaining estimated balance:')
  lines.push(remaining != null ? `${remaining.toFixed(4)}` : 'UNKNOWN')
  lines.push('')
  lines.push(formatSceneImageInspectionReport(inspection))
  lines.push('')
  lines.push('AWAITING IMAGE APPROVAL')
  lines.push('')
  lines.push(`Run: npm run v7:approve-scene -- ${snapshot.production.id} --scene ${args.sceneNumber}`)

  return { exitCode: 0, output: lines.join('\n') }
}

export async function approveV7SafeScene(params: {
  supabase: SupabaseServerClient
  snapshot: V7ProductionSnapshot
  sceneNumber: number
  approvedBy?: string
}): Promise<string> {
  const safeState = readSafeExecutionState(
    params.snapshot.production.timeline_json as Record<string, unknown> | null
  )
  const generation = safeState.generations[String(params.sceneNumber)]
  if (!generation?.imageUrl) {
    throw new Error(`Scene ${params.sceneNumber} has not been generated via safe execution`)
  }

  const timeline = mergeSafeExecutionState(
    params.snapshot.production.timeline_json as Record<string, unknown> | null,
    {
      approvedScenes: {
        [String(params.sceneNumber)]: {
          approvedAt: new Date().toISOString(),
          approvedBy: params.approvedBy ?? 'cli',
        },
      },
    }
  )

  const { error } = await params.supabase
    .from('v7_productions')
    .update({ timeline_json: timeline })
    .eq('id', params.snapshot.production.id)

  if (error) throw new Error(error.message)

  const lines = [
    'SCENE APPROVED',
    '',
    `Production: ${params.snapshot.production.id}`,
    `Scene: ${params.sceneNumber}`,
    `Image: ${generation.imageUrl}`,
    '',
    'Generation executed: NO',
    'Pollen spent: 0',
    '',
    params.sceneNumber < params.snapshot.scenes.length
      ? `Next: npm run v7:safe-generate -- ${params.snapshot.production.id} --scene ${params.sceneNumber + 1}`
      : 'All scenes generated — video generation remains blocked until explicitly approved.',
  ]

  return lines.join('\n')
}
