import type { CinematicProjectState } from '@/stores/cinematic-project'

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
  >
) {
  return {
    topic: state.prompt,
    prompt: state.prompt,
    tone: state.style,
    style: state.style,
    duration: state.duration,
    niche: state.niche,
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
  }
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
      typeof data?.error === 'string' ? data.error : 'Refinement failed'
    )
  }
  return data as T
}

export function regenerateHook(
  state: Parameters<typeof buildRegenPayload>[0]
) {
  return postRegen<{ hook: string }>('/api/regenerate-hook', buildRegenPayload(state))
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
