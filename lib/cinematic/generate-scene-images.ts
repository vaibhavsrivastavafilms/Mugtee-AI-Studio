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
import {
  generateGeminiSceneImage,
  generateOpenAISceneImage,
  hasGeminiImageKey,
  hasImageGenerationKey,
  persistRemoteImage,
} from '@/lib/ai/generate-scene-image'
import type { VirloMetadata } from '@/lib/virlo-engine/types'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import {
  cameraVariationDirective,
  variationCompositionDirective,
} from '@/lib/cinematic/visual-diversity'

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
}

export type GenerateSceneImagesResult = {
  scenes: GeneratedScene[]
  mock: boolean
  characterDescription: string
}

function promptContext(
  input: GenerateSceneImagesInput,
  scene: GeneratedScene,
  index: number,
  total: number
): SceneImagePromptContext {
  return {
    characterDescription: input.characterDescription,
    niche: input.niche,
    style: input.style,
    visualStyleLabel: input.visualStyle?.label,
    emotionalGoal: input.virlo?.emotionalGoal,
    hook: input.hook,
    sceneIndex: index + 1,
    totalScenes: total,
    variation: input.variation,
    variationDirective: input.variation
      ? variationCompositionDirective(index, input.diversityAttempt ?? 0)
      : cameraVariationDirective(index, input.diversityAttempt ?? 0),
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
  const updated = input.scenes.map((scene) => ({ ...scene }))

  for (let i = 0; i < updated.length; i++) {
    const scene = updated[i]
    if (!scene) continue
    if (idFilter && !idFilter.has(scene.id)) continue

    const ctx = promptContext(input, scene, i, updated.length)
    if (!scene.imagePrompt?.trim()) {
      scene.imagePrompt = buildSceneImagePrompt(scene, {
        ...ctx,
        characterDescription,
      })
    }

    const scenePrompt = buildSceneImagePrompt(scene, {
      ...ctx,
      characterDescription,
    })
    const filename = input.userId
      ? `${input.userId}/faceless/scene_${scene.id}_${Date.now()}.png`
      : `anon/faceless/scene_${scene.id}_${Date.now()}.png`

    let imageUrl: string | null = null

    // Primary: Gemini via Emergent gateway (same provider as /api/ai/image Flow pipeline)
    if (hasGeminiImageKey()) {
      imageUrl = await generateGeminiSceneImage(scenePrompt, { filename })
    }

    // Fallback: OpenAI DALL-E 3 (disabled in free-tier-only mode)
    if (!imageUrl && allowDalleImages()) {
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
  }
}
