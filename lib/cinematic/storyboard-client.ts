import { buildRegenPayload } from '@/lib/cinematic/refinement-client'
import type { StoryboardImage } from '@/stores/cinematic-project'

type RegenState = Parameters<typeof buildRegenPayload>[0]

async function postStoryboard<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Storyboard failed')
  }
  return data as T
}

export function generateSceneStoryboard(
  state: RegenState,
  sceneIndex: number,
  projectId: string
) {
  return postStoryboard<{
    sceneIndex: number
    storyboardImages: StoryboardImage[]
    activeStoryboardId: string
    mock?: boolean
  }>('/api/cinematic/storyboard', {
    ...buildRegenPayload(state),
    projectId,
    sceneIndex,
  })
}

export function enhanceStoryboard(
  state: RegenState,
  sceneIndex: number,
  projectId: string
) {
  return postStoryboard<{
    sceneIndex: number
    storyboardImages: StoryboardImage[]
    activeStoryboardId: string
    mock?: boolean
  }>('/api/enhance-storyboard', {
    ...buildRegenPayload(state),
    projectId,
    sceneIndex,
  })
}

export type { RegenState as StoryboardRegenState }
