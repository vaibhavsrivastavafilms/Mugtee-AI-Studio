import type { CinematicProjectState } from '@/stores/cinematic-project'

import { SOFT_ERROR_COPY } from '@/lib/creator/soft-error-copy'
import { sessionLanguageMixed } from '@/lib/i18n/creator-language-session'



export type HookRegenPayloadOptions = {

  previousHooks?: string[]

  hookVariantIndex?: number

  hookVariantNumber?: number

  strongVariation?: boolean

  emotionalGoal?: string

  contentAngleId?: string

}



export function buildRegenPayload(

  state: Pick<

    CinematicProjectState,

    | 'prompt'

    | 'style'

    | 'duration'

    | 'niche'

    | 'hook'

    | 'summary'

    | 'script'

    | 'scenes'

    | 'captionLines'

    | 'suggestedVoiceStyle'

  >,

  hookOptions?: HookRegenPayloadOptions

) {

  return {

    topic: state.prompt,

    prompt: state.prompt,

    tone: state.style,

    style: state.style,

    duration: state.duration,

    niche: state.niche,

    language: (state as { language?: string }).language ?? 'en',

    languageMixed: sessionLanguageMixed(),

    visualStyle: (state as { visualStyle?: unknown }).visualStyle ?? undefined,

    viralScript: (state as { viralScript?: unknown }).viralScript ?? undefined,

    hook: state.hook,

    summary: state.summary,

    script: state.script,

    scenes: state.scenes.map((scene) => ({

      id: scene.id,

      index: scene.index,

      title: scene.title,

      narration: scene.narration,

      duration: scene.duration,

      visualPrompt: scene.visualPrompt,

      cameraAngle: scene.cameraAngle,

      lightingMood: scene.lightingMood,

      environment: scene.environment,

      colorPalette: scene.colorPalette,

      movementStyle: scene.movementStyle,

    })),

    captionLines: state.captionLines,

    suggestedVoiceStyle: state.suggestedVoiceStyle,

    previousHooks: hookOptions?.previousHooks ?? [],

    hookVariantIndex:

      hookOptions?.hookVariantIndex ??

      (hookOptions?.previousHooks?.length ?? 0),

    hookVariantNumber: hookOptions?.hookVariantNumber,

    strongVariation: hookOptions?.strongVariation ?? false,

    emotionalGoal: hookOptions?.emotionalGoal,

    contentAngleId: hookOptions?.contentAngleId,

  }

}



export type HookRegenResponse = {

  hook: string

  hookFramework?: string

  hookVariantNumber?: number

  virlo?: import('@/lib/virlo-engine/types').VirloMetadata

  mock?: boolean

}



async function postRegen<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {

  const res = await fetch(endpoint, {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(body),

  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {

    throw new Error(

      typeof data?.error === 'string'

        ? data.error

        : SOFT_ERROR_COPY.refinementPaused

    )

  }

  return data as T

}



export function regenerateHook(

  state: Parameters<typeof buildRegenPayload>[0],

  hookOptions?: HookRegenPayloadOptions

) {

  return postRegen<HookRegenResponse>(

    '/api/regenerate-hook',

    buildRegenPayload(state, hookOptions)

  )

}



export function regenerateScene(

  state: Parameters<typeof buildRegenPayload>[0],

  sceneIndex: number

) {

  return postRegen<{

    sceneIndex: number

    title: string

    description: string

    duration: number

    visualPrompt: string

    cameraAngle: string

    lightingMood: string

    environment: string

    colorPalette: string

    movementStyle: string

  }>('/api/regenerate-scene', {

    ...buildRegenPayload(state),

    sceneIndex,

  })

}



export function enhanceVisualDirection(

  state: Parameters<typeof buildRegenPayload>[0],

  sceneIndex: number

) {

  return postRegen<{

    sceneIndex: number

    visual: {

      visualPrompt: string

      cameraAngle: string

      lightingMood: string

      environment: string

      colorPalette: string

      movementStyle: string

    }

  }>('/api/enhance-visual', {

    ...buildRegenPayload(state),

    sceneIndex,

  })

}



export function improveCaption(state: Parameters<typeof buildRegenPayload>[0]) {

  return postRegen<{

    captionPack: { primary: string; cta: string; hashtags: string[] }

    captionLines: string[]

  }>('/api/improve-caption', buildRegenPayload(state))

}



export function suggestVoice(state: Parameters<typeof buildRegenPayload>[0]) {

  return postRegen<{

    suggestedVoiceStyle: string

    label: string

    reason?: string

  }>('/api/suggest-voice', buildRegenPayload(state))

}



export {

  enhanceStoryboard,

  generateSceneStoryboard,

} from '@/lib/cinematic/storyboard-client'

