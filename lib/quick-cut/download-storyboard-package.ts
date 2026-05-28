import type { GeneratedScene } from '@/lib/cinematic/generation'

export type StoryboardExportPayload = {
  format: 'quick-cut-storyboard-mvp'
  exportedAt: string
  title: string
  hook: string
  script: string
  voiceUrl: string | null
  scenes: Array<{
    id: string
    title: string
    description: string
    duration: number
    imageUrl: string | null
  }>
}

export function buildStoryboardExportPayload(input: {
  title: string
  hook: string
  script: string
  scenes: GeneratedScene[]
  voiceUrl?: string | null
}): StoryboardExportPayload {
  return {
    format: 'quick-cut-storyboard-mvp',
    exportedAt: new Date().toISOString(),
    title: input.title,
    hook: input.hook,
    script: input.script,
    voiceUrl: input.voiceUrl ?? null,
    scenes: input.scenes.map((scene, i) => ({
      id: scene.id || `scene-${i}`,
      title: scene.title || `Scene ${i + 1}`,
      description: scene.description || '',
      duration: scene.duration ?? 4,
      imageUrl: scene.imageUrl?.trim() || null,
    })),
  }
}

/** Downloads a JSON storyboard package for Quick Cut MVP export preview. */
export function downloadStoryboardPackage(
  payload: StoryboardExportPayload,
  filename: string
): void {
  const safeName = filename.endsWith('.json') ? filename : `${filename}.json`
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = safeName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
