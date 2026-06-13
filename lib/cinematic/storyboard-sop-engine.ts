import { createCachedOpenAIChatCompletion } from '@/lib/ai/cached-openai-chat.server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import {
  buildStoryboardSopPrompt,
  buildStoryboardSopSystemAugment,
  finalizeStoryboardSceneRecords,
  finalizeStoryboardScenes,
  mapStoryboardSegmentsToStoryboardScenes,
  parseStoryboardSegments,
  resolveStoryboardSceneCount,
} from '@/lib/ai/prompts/youtube/storyboard-sop-prompt'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { ensureScenesHaveImagePrompts } from '@/lib/cinematic/generation'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import { logError } from '@/lib/workspace/validation'
import type { DeepResearchPipelineOptions } from '@/types/deep-research'
import type { DirectorMode } from '@/lib/cinematic/director-modes'
import {
  buildStoryboardProjectFields,
  storyboardScenesToGeneratedScenes,
  type StoryboardProjectFields,
  type StoryboardScene,
} from '@/types/storyboard'

export type StoryboardSopGenerationInput = {
  script: string
  language: ProjectLanguage
  durationSec: number
  /** Quick Cut — merge segments into retention-scaled beat count */
  retentionMode?: boolean
  directorMode?: DirectorMode
  visualTemplateDirective?: string
} & Pick<DeepResearchPipelineOptions, 'researchDocument' | 'researchReport'>

export type StoryboardSopResult = StoryboardProjectFields

/** LLM pass: script → SOP storyboard scenes with project metadata. */
export async function runStoryboardSop(
  script: string,
  durationSec: number,
  options: Partial<Omit<StoryboardSopGenerationInput, 'script' | 'durationSec'>> = {}
): Promise<StoryboardSopResult | null> {
  const { logStoryboardInput, logStoryboardStart } = await import(
    '@/lib/pipeline/pipeline-trace'
  )
  logStoryboardStart('runStoryboardSop', { durationSec, scriptLen: script.length })
  logStoryboardInput({ durationSec, scriptPreview: script.slice(0, 120) })

  const input: StoryboardSopGenerationInput = {
    script,
    durationSec,
    language: options.language ?? 'en',
    ...options,
  }

  const scenes = await generateStoryboardScenesInternal(input)
  if (!scenes || scenes.length < 2) return null
  return buildStoryboardProjectFields(scenes)
}

/** LLM pass: script → SOP segments → GeneratedScene records for image gen. */
export async function generateScenesViaStoryboardSop(
  input: StoryboardSopGenerationInput
): Promise<GeneratedScene[] | null> {
  const result = await runStoryboardSop(input.script, input.durationSec, {
    language: input.language,
    researchDocument: input.researchDocument,
    researchReport: input.researchReport,
    retentionMode: input.retentionMode,
  })
  if (!result) return null
  const finalized = finalizeStoryboardScenes(
    storyboardScenesToGeneratedScenes(result.storyboardScenes),
    input.durationSec
  )
  return ensureScenesHaveImagePrompts(finalized)
}

async function generateStoryboardScenesInternal(
  input: StoryboardSopGenerationInput
): Promise<StoryboardScene[] | null> {
  if (!process.env.OPENAI_API_KEY || !input.script.trim()) return null

  const retentionMode = input.retentionMode ?? input.durationSec <= 60
  const sceneTarget = retentionMode
    ? resolveStoryboardSceneCount(input.durationSec)
    : undefined

  try {
    const openai = getOpenAIClient()
    if (process.env.NODE_ENV === 'development') {
      console.log('[OPENAI] REQUEST START', { model: 'gpt-4o-mini', step: 'storyboard-sop' })
    }
    const completion = await createCachedOpenAIChatCompletion(openai, {
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
            researchReport: input.researchReport,
            sceneTarget,
            retentionMode,
            directorMode: input.directorMode,
            visualTemplateDirective: input.visualTemplateDirective,
          }),
        },
      ],
    })

    const content = completion.choices[0]?.message?.content || '{}'
    if (process.env.NODE_ENV === 'development') {
      console.log('[OPENAI] REQUEST SUCCESS', { step: 'storyboard-sop' })
    }
    const json = JSON.parse(content) as Record<string, unknown>
    const segments = parseStoryboardSegments(json)
    if (segments.length < 2) return null

    const mapped = mapStoryboardSegmentsToStoryboardScenes(segments, {
      durationSec: input.durationSec,
      sceneTarget: sceneTarget ?? segments.length,
      mergeToTarget: retentionMode,
    })

    return finalizeStoryboardSceneRecords(mapped, input.durationSec)
  } catch (err) {
    logError('storyboard-sop-engine', err)
    return null
  }
}

export type { StoryboardScene, StoryboardProjectFields }
