import { getOpenAIClient } from '@/lib/ai/openai-client'
import {
  buildStoryboardSopPrompt,
  buildStoryboardSopSystemAugment,
  finalizeStoryboardScenes,
  mapStoryboardSegmentsToScenes,
  parseStoryboardSegments,
} from '@/lib/ai/prompts/youtube/storyboard-sop-prompt'
import { CREATOR_RETENTION_SCENE_COUNT } from '@/lib/cinematic/viral-structure'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { ensureScenesHaveImagePrompts } from '@/lib/cinematic/generation'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import { logError } from '@/lib/workspace/validation'
import type { DeepResearchPipelineOptions } from '@/types/deep-research'

export type StoryboardSopGenerationInput = {
  script: string
  language: ProjectLanguage
  durationSec: number
  /** Quick Cut — merge segments into 7 retention beats */
  retentionMode?: boolean
} & Pick<DeepResearchPipelineOptions, 'researchDocument'>

/** LLM pass: script → SOP segments → scene records. */
export async function generateScenesViaStoryboardSop(
  input: StoryboardSopGenerationInput
): Promise<GeneratedScene[] | null> {
  if (!process.env.OPENAI_API_KEY || !input.script.trim()) return null

  const retentionMode = input.retentionMode ?? input.durationSec <= 60
  const sceneTarget = retentionMode ? CREATOR_RETENTION_SCENE_COUNT : undefined

  try {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.65,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${buildStoryboardSopSystemAugment()}\nOutput strict JSON only.`,
        },
        {
          role: 'user',
          content: buildStoryboardSopPrompt(input.script, {
            language: input.language,
            durationSec: input.durationSec,
            researchDocument: input.researchDocument,
            sceneTarget,
            retentionMode,
          }),
        },
      ],
    })

    const content = completion.choices[0]?.message?.content || '{}'
    const json = JSON.parse(content) as Record<string, unknown>
    const segments = parseStoryboardSegments(json)
    if (segments.length < 2) return null

    const mapped = mapStoryboardSegmentsToScenes(segments, {
      durationSec: input.durationSec,
      sceneTarget: sceneTarget ?? segments.length,
      mergeToTarget: retentionMode,
    })

    const finalized = finalizeStoryboardScenes(mapped, input.durationSec)
    return ensureScenesHaveImagePrompts(finalized)
  } catch (err) {
    logError('storyboard-sop-engine', err)
    return null
  }
}
