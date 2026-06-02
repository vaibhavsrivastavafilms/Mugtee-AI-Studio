import {
  buildDalleSceneImagePrompt,
  buildSceneImagePrompt,
  ensureScenesHaveImagePrompts,
  extractCharacterDescription,
  type GeneratedScene,
  type SceneImagePromptContext,
} from '@/lib/cinematic/generation'
import { placeholderSceneImageUrl } from '@/lib/cinematic/scene-preview-url'
import { allowDalleImages } from '@/lib/ai/free-tier'
import { ImageGenerationUnavailableError } from '@/lib/ai/image-provider-errors'
import {
  generateOpenAISceneImage,
  generateSceneImage,
  hasImageGenerationKey,
  persistRemoteImage,
} from '@/lib/ai/generate-scene-image'
import type { VirloMetadata } from '@/lib/virlo-engine/types'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import {
  cameraVariationDirective,
  variationCompositionDirective,
} from '@/lib/cinematic/visual-diversity'
import { formatStoryBibleForPrompt, type StoryBible } from '@/lib/cinematic/story-bible'
import {
  formatContentBriefForPrompt,
  type ContentBrief,
} from '@/lib/content-director/content-brief'
import {
  blueprintBySceneId,
  buildVisualConsistencyPack,
  type OutputAlignmentControls,
  type SceneBlueprint,
} from '@/lib/cinematic/scene-blueprint'
import {
  formatVisualBibleForPrompt,
  mergeVisualBibleIntoBlueprints,
} from '@/lib/cinematic/visual-bible'
import type { VisualBible } from '@/lib/pipeline/v3-types'
import {
  rebuildAlignedImagePrompt,
  scoreSceneAlignment,
  validateSequenceCoherence,
} from '@/lib/cinematic/output-alignment'
import {
  appendPromptSuffix,
  duplicateImageVariationSuffix,
  findConsecutiveDuplicateSceneImages,
  findDuplicateImagePromptFingerprints,
  imagePromptFingerprint,
  type SceneImageDuplicate,
} from '@/lib/cinematic/scene-image-prompt'
import { resolveStyleTemplatePromptPrefix } from '@/lib/templates/style-templates'

export type GenerateSceneImagesInput = {
  scenes: GeneratedScene[]
  characterDescription?: string
  niche?: string
  virlo?: VirloMetadata | null
  style?: string
  visualStyle?: VisualStyle | null
  hook?: string
  script?: string
  /** Regenerate only these scene ids */
  sceneIds?: string[]
  /** Produce variationImageUrl instead of replacing imageUrl */
  variation?: boolean
  /** Rotation index for camera/framing diversity on regen */
  diversityAttempt?: number
  userId?: string
  /** Reference style image or note present — SOP prefix on image prompt */
  hasReferenceStyle?: boolean
  referenceStyleNote?: string
  storyBible?: StoryBible | null
  contentBrief?: ContentBrief | null
  /** Scene blueprints — required for aligned image prompts */
  sceneBlueprints?: SceneBlueprint[]
  /** V3 Visual Bible — merged into blueprints and injected into Flux prompts */
  visualBible?: VisualBible | null
  outputAlignmentControls?: OutputAlignmentControls | null
  styleTemplateId?: string | null
}

export type GenerateSceneImagesResult = {
  scenes: GeneratedScene[]
  mock: boolean
  characterDescription: string
  /** Scene ids that fell back to placeholders despite configured providers */
  degradedSceneIds?: string[]
  /** Providers attempted before placeholder fallback (per scene) */
  imageFailures?: Array<{ sceneId: string; attempted: string[] }>
  /** Per-scene alignment scores after validation pass */
  alignmentResults?: Array<{
    sceneId: string
    alignmentScore: number
    passed: boolean
    issues: string[]
  }>
  sequenceCoherence?: { coherent: boolean; score: number; issues: string[] }
  /** Scene ids that received the same imageUrl as the prior scene */
  duplicateImageWarnings?: SceneImageDuplicate[]
  /** Scene ids regenerated after duplicate URL detection */
  retriedSceneIds?: string[]
  /** Scene ids whose final prompts fingerprint-collided (logged server-side) */
  duplicatePromptSceneIds?: string[]
}

function promptContext(
  input: GenerateSceneImagesInput,
  scene: GeneratedScene,
  index: number,
  total: number,
  blueprint?: SceneBlueprint | null,
  visualConsistency?: ReturnType<typeof buildVisualConsistencyPack> | null,
  visualBibleSection?: string
): SceneImagePromptContext {
  const hasReferenceStyle = Boolean(
    input.hasReferenceStyle || input.referenceStyleNote?.trim()
  )
  return {
    characterDescription: input.characterDescription,
    niche: input.niche,
    style: input.style,
    visualStyleLabel: input.visualStyle?.label,
    visualStyle: input.visualStyle ?? undefined,
    emotionalGoal: input.virlo?.emotionalGoal,
    hook: input.hook,
    sceneIndex: index + 1,
    totalScenes: total,
    variation: input.variation,
    variationDirective: input.variation
      ? variationCompositionDirective(index, input.diversityAttempt ?? 0)
      : cameraVariationDirective(index, input.diversityAttempt ?? 0),
    hasReferenceStyle,
    storyBible: input.storyBible ?? undefined,
    sceneBlueprint: blueprint ?? undefined,
    visualConsistency: visualConsistency ?? undefined,
    visualBibleSection,
    contentBriefSection: formatContentBriefForPrompt(input.contentBrief),
    styleTemplatePrefix: resolveStyleTemplatePromptPrefix(input.styleTemplateId),
    previousScene:
      index > 0
        ? {
            title: input.scenes[index - 1]?.title,
            description: input.scenes[index - 1]?.description,
            visualPrompt: input.scenes[index - 1]?.visualPrompt,
            imagePrompt: input.scenes[index - 1]?.imagePrompt,
            environment: input.scenes[index - 1]?.environment,
            colorPalette: input.scenes[index - 1]?.colorPalette,
          }
        : null,
  }
}

function resolveCharacterDescription(input: GenerateSceneImagesInput): string {
  if (input.characterDescription?.trim()) return input.characterDescription.trim()
  if (input.script?.trim()) {
    return extractCharacterDescription(input.script, input.scenes)
  }
  return extractCharacterDescription('', input.scenes)
}

export async function generateSceneImages(
  input: GenerateSceneImagesInput
): Promise<GenerateSceneImagesResult> {
  const characterDescription = resolveCharacterDescription(input)
  const canGenerate = hasImageGenerationKey()
  const idFilter = input.sceneIds?.length
    ? new Set(input.sceneIds)
    : null

  const blueprintSource =
    input.visualBible && input.sceneBlueprints?.length
      ? mergeVisualBibleIntoBlueprints(input.sceneBlueprints, input.visualBible)
      : (input.sceneBlueprints ?? [])

  const blueprintMap = blueprintBySceneId(blueprintSource)
  const consistency =
    blueprintSource.length ?
      buildVisualConsistencyPack(blueprintSource, {
        characterDescription,
        visualStyle: input.visualStyle ?? null,
        storyBible: input.storyBible ?? null,
        controls: input.outputAlignmentControls ?? null,
      })
    : null

  const visualBibleSection = input.visualBible
    ? formatVisualBibleForPrompt(input.visualBible)
    : undefined

  const sequenceCoherence = blueprintSource.length
    ? validateSequenceCoherence(blueprintSource)
    : undefined

  let anyMock = !canGenerate
  const imageFailures: Array<{ sceneId: string; attempted: string[] }> = []
  const alignmentResults: NonNullable<GenerateSceneImagesResult['alignmentResults']> = []
  const updated = input.scenes.map((scene) => ({ ...scene }))
  let storyBibleLogged = false
  const retriedSceneIds: string[] = []
  const promptFingerprints: Array<{ sceneId: string; prompt: string }> = []

  const targets = updated
    .map((scene, index) => ({ scene, index }))
    .filter(({ scene }) => scene && (!idFilter || idFilter.has(scene.id)))

  async function renderSceneStill(
    scene: GeneratedScene,
    index: number,
    duplicateRetry = 0
  ): Promise<GeneratedScene> {
    const blueprint = blueprintMap.get(scene.id) ?? null
    const ctx = promptContext(
      input,
      scene,
      index,
      updated.length,
      blueprint,
      consistency,
      visualBibleSection
    )
    if (input.storyBible && !storyBibleLogged) {
      formatStoryBibleForPrompt(input.storyBible, { log: true })
      storyBibleLogged = true
    }

    let scenePrompt = buildSceneImagePrompt(scene, {
      ...ctx,
      characterDescription,
    })

    if (blueprint && consistency) {
      let alignmentAttempt = 0
      let aligned = scoreSceneAlignment(
        { ...scene, imagePrompt: scenePrompt },
        blueprint
      )
      while (!aligned.passed && alignmentAttempt < 2) {
        scene.imagePrompt = rebuildAlignedImagePrompt(
          blueprint,
          consistency,
          alignmentAttempt
        )
        scenePrompt = buildSceneImagePrompt(
          { ...scene, imagePrompt: scene.imagePrompt },
          { ...ctx, characterDescription }
        )
        aligned = scoreSceneAlignment(
          { ...scene, imagePrompt: scenePrompt },
          blueprint
        )
        alignmentAttempt += 1
      }
      alignmentResults.push({
        sceneId: scene.id,
        alignmentScore: aligned.alignmentScore,
        passed: aligned.passed,
        issues: aligned.issues,
      })
    } else if (!scene.imagePrompt?.trim()) {
      scene.imagePrompt = scenePrompt
    }

    if (duplicateRetry > 0) {
      scenePrompt = appendPromptSuffix(
        scenePrompt,
        duplicateImageVariationSuffix(index + 1, duplicateRetry)
      )
    }

    promptFingerprints.push({ sceneId: scene.id, prompt: scenePrompt })

    const filename = input.userId
      ? `${input.userId}/faceless/scene_${scene.id}_${Date.now()}_${duplicateRetry}.png`
      : `anon/faceless/scene_${scene.id}_${Date.now()}_${duplicateRetry}.png`

    let imageUrl: string | null = null
    const attempted: string[] = []

    attempted.push('fluxapi-together-pollinations')
    try {
      const result = await generateSceneImage(scenePrompt, {
        filename,
        userId: input.userId,
        hasReferenceStyle: ctx.hasReferenceStyle,
      })
      imageUrl = result.url
      if (result.provider) attempted.push(result.provider)
    } catch (err) {
      if (err instanceof ImageGenerationUnavailableError) throw err
    }

    if (!imageUrl && allowDalleImages()) {
      attempted.push('openai')
      const dallePrompt = buildDalleSceneImagePrompt(scene, {
        ...ctx,
        characterDescription,
      })
      const remoteUrl = await generateOpenAISceneImage(dallePrompt)
      if (remoteUrl) {
        imageUrl = await persistRemoteImage({
          remoteUrl,
          userId: input.userId,
          filename,
        })
      }
    }

    if (!imageUrl) {
      if (canGenerate && attempted.length > 0) {
        imageFailures.push({ sceneId: scene.id, attempted })
      }
      imageUrl = placeholderSceneImageUrl(scene, index)
      anyMock = true
    }

    const prevScene = index > 0 ? updated[index - 1] : null
    const prevUrl = prevScene?.imageUrl?.trim()
    if (
      !input.variation &&
      imageUrl &&
      prevUrl &&
      imageUrl.trim() === prevUrl &&
      duplicateRetry < 1
    ) {
      console.warn(
        '[generate-scene-images] duplicate imageUrl vs previous scene — retrying',
        { sceneId: scene.id, previousSceneId: prevScene?.id, fingerprint: imagePromptFingerprint(scenePrompt) }
      )
      retriedSceneIds.push(scene.id)
      return renderSceneStill(scene, index, duplicateRetry + 1)
    }

    if (input.variation) {
      scene.variationImageUrl = imageUrl
    } else {
      scene.imageUrl = imageUrl
    }
    return scene
  }

  for (const { scene, index } of targets) {
    updated[index] = await renderSceneStill(scene, index)
  }

  const duplicateImageWarnings = findConsecutiveDuplicateSceneImages(updated)
  if (duplicateImageWarnings.length) {
    console.warn('[generate-scene-images] consecutive duplicate scene images', duplicateImageWarnings)
  }

  const duplicatePromptSceneIds = findDuplicateImagePromptFingerprints(promptFingerprints)

  return {
    scenes: ensureScenesHaveImagePrompts(updated),
    mock: anyMock,
    characterDescription,
    ...(alignmentResults.length ? { alignmentResults } : {}),
    ...(sequenceCoherence ? { sequenceCoherence } : {}),
    ...(imageFailures.length
      ? {
          degradedSceneIds: imageFailures.map((f) => f.sceneId),
          imageFailures,
        }
      : {}),
    ...(duplicateImageWarnings.length ? { duplicateImageWarnings } : {}),
    ...(retriedSceneIds.length ? { retriedSceneIds } : {}),
    ...(duplicatePromptSceneIds.length
      ? { duplicatePromptSceneIds }
      : {}),
  }
}
