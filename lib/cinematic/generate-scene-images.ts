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
  rebuildAlignedImagePrompt,
  scoreSceneAlignment,
  validateSequenceCoherence,
} from '@/lib/cinematic/output-alignment'

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
  outputAlignmentControls?: OutputAlignmentControls | null
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
}

function promptContext(
  input: GenerateSceneImagesInput,
  scene: GeneratedScene,
  index: number,
  total: number,
  blueprint?: SceneBlueprint | null,
  visualConsistency?: ReturnType<typeof buildVisualConsistencyPack> | null
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
    contentBriefSection: formatContentBriefForPrompt(input.contentBrief),
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

  const blueprintMap = blueprintBySceneId(input.sceneBlueprints ?? [])
  const consistency =
    input.sceneBlueprints?.length ?
      buildVisualConsistencyPack(input.sceneBlueprints, {
        characterDescription,
        visualStyle: input.visualStyle ?? null,
        storyBible: input.storyBible ?? null,
        controls: input.outputAlignmentControls ?? null,
      })
    : null

  const sequenceCoherence = input.sceneBlueprints?.length
    ? validateSequenceCoherence(input.sceneBlueprints)
    : undefined

  let anyMock = !canGenerate
  const imageFailures: Array<{ sceneId: string; attempted: string[] }> = []
  const alignmentResults: GenerateSceneImagesResult['alignmentResults'] = []
  const updated = input.scenes.map((scene) => ({ ...scene }))
  let storyBibleLogged = false

  for (let i = 0; i < updated.length; i++) {
    const scene = updated[i]
    if (!scene) continue
    if (idFilter && !idFilter.has(scene.id)) continue

    const blueprint = blueprintMap.get(scene.id) ?? null
    const ctx = promptContext(
      input,
      scene,
      i,
      updated.length,
      blueprint,
      consistency
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
    const filename = input.userId
      ? `${input.userId}/faceless/scene_${scene.id}_${Date.now()}.png`
      : `anon/faceless/scene_${scene.id}_${Date.now()}.png`

    let imageUrl: string | null = null
    const attempted: string[] = []

    // Primary: FluxAPI Kontext → Together → Pollinations
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

    // Fallback: OpenAI Images API (disabled in free-tier-only mode)
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
      imageUrl = placeholderSceneImageUrl(scene, i)
      anyMock = true
    }

    if (input.variation) {
      scene.variationImageUrl = imageUrl
    } else {
      scene.imageUrl = imageUrl
    }
    updated[i] = scene
  }

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
  }
}
