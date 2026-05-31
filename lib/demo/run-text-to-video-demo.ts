import type { TextToVideoDemoTemplate } from '@/lib/demo/text-to-video-templates'
import {
  defaultTextToVideoTemplate,
  textToVideoTemplateById,
} from '@/lib/demo/text-to-video-templates'

export type TextToVideoDemoPipelineStep =
  | 'analyzing'
  | 'hook'
  | 'script'
  | 'scenes'
  | 'images'
  | 'voice'
  | 'render'
  | 'complete'

/** Maps demo pipeline steps to CinematicTimeline step ids. */
export type TextToVideoTimelineStep =
  | 'analyzing'
  | 'script'
  | 'scenes'
  | 'visuals'
  | 'voice'
  | 'render'

export const TEXT_TO_VIDEO_DEMO_PIPELINE: {
  id: TextToVideoDemoPipelineStep
  label: string
  timelineStep: TextToVideoTimelineStep
  delayMs: number
}[] = [
  { id: 'analyzing', label: 'Reading your brief…', timelineStep: 'analyzing', delayMs: 700 },
  { id: 'hook', label: 'Crafting scroll-stopping hook…', timelineStep: 'analyzing', delayMs: 900 },
  { id: 'script', label: 'Writing cinematic script…', timelineStep: 'script', delayMs: 1100 },
  { id: 'scenes', label: 'Building emotional pacing…', timelineStep: 'scenes', delayMs: 900 },
  { id: 'images', label: 'Generating cinematic visuals…', timelineStep: 'visuals', delayMs: 1200 },
  { id: 'voice', label: 'Synthesizing voiceover…', timelineStep: 'voice', delayMs: 900 },
  { id: 'render', label: 'Packaging storyboard export…', timelineStep: 'render', delayMs: 800 },
  { id: 'complete', label: 'Your cinematic video is ready', timelineStep: 'render', delayMs: 400 },
]

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type TextToVideoDemoProgress = {
  pipelineStep: TextToVideoDemoPipelineStep
  label: string
  timelineStep: TextToVideoTimelineStep
  progress: number
}

export function resolveDemoTemplate(
  templateId: string | null | undefined,
  topic?: string
): TextToVideoDemoTemplate {
  const byId = textToVideoTemplateById(templateId)
  if (byId) return byId
  const fallback = defaultTextToVideoTemplate()
  if (topic?.trim()) {
    return { ...fallback, topic: topic.trim() }
  }
  return fallback
}

/** Replays Mugtee pipeline steps with cached demo data — no API calls. */
export async function runTextToVideoDemoPipeline(
  templateId: string | null | undefined,
  options: {
    topic?: string
    onProgress?: (progress: TextToVideoDemoProgress) => void
    signal?: AbortSignal
  } = {}
): Promise<TextToVideoDemoTemplate> {
  const template = resolveDemoTemplate(templateId, options.topic)
  const totalSteps = TEXT_TO_VIDEO_DEMO_PIPELINE.length

  for (let i = 0; i < totalSteps; i++) {
    if (options.signal?.aborted) {
      throw new DOMException('Demo pipeline aborted', 'AbortError')
    }

    const step = TEXT_TO_VIDEO_DEMO_PIPELINE[i]
    options.onProgress?.({
      pipelineStep: step.id,
      label: step.label,
      timelineStep: step.timelineStep,
      progress: Math.round(((i + 1) / totalSteps) * 100),
    })

    if (step.delayMs > 0) {
      await delay(step.delayMs)
    }
  }

  return template
}
