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
}

export type GenerateSceneImagesResult = {
  scenes: GeneratedScene[]
  mock: boolean
  characterDescription: string
  /** Scene ids that fell back to placeholders despite configured providers */
  degradedSceneIds?: string[]
  /** Providers attempted before placeholder fallback (per scene) */
  imageFailures?: Array<{ sceneId: string; attempted: string[] }>
}

function promptContext(
  input: GenerateSceneImagesInput,
  scene: GeneratedScene,
  index: number,
  total: number
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

  let anyMock = !canGenerate
  const imageFailures: Array<{ sceneId: string; attempted: string[] }> = []
  const updated = input.scenes.map((scene) => ({ ...scene }))
  let storyBibleLogged = false

  for (let i = 0; i < updated.length; i++) {
    const scene = updated[i]
    if (!scene) continue
    if (idFilter && !idFilter.has(scene.id)) continue

    const ctx = promptContext(input, scene, i, updated.length)
    if (input.storyBible && !storyBibleLogged) {
      formatStoryBibleForPrompt(input.storyBible, { log: true })
      storyBibleLogged = true
    }
    if (!scene.imagePrompt?.trim()) {
      scene.imagePrompt = buildSceneImagePrompt(scene, {
        ...ctx,
        characterDescription,
      })
    }

    // Storyboard SOP scene-only prompt + reference prefix applied in buildSceneImagePrompt
    const scenePrompt = buildSceneImagePrompt(scene, {
      ...ctx,
      characterDescription,
    })
    const filename = input.userId
      ? `${input.userId}/faceless/scene_${scene.id}_${Date.now()}.png`
      : `anon/faceless/scene_${scene.id}_${Date.now()}.png`

    let imageUrl: string | null = null
    const attempted: string[] = []

    // Primary: Together AI → Pollinations (free-tier image providers)
    attempted.push('together-pollinations')
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
    ...(imageFailures.length
      ? {
          degradedSceneIds: imageFailures.map((f) => f.sceneId),
          imageFailures,
        }
      : {}),
  }
}
