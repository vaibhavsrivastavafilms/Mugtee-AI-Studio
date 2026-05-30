import type { GeneratedScene } from '@/lib/cinematic/generation'

export type ProjectTranscriptSource =
  | 'original_transcript'
  | 'script'
  | 'scenes'
  | 'captions'

export type ProjectTranscriptInput = {
  originalTranscript?: string | null
  script?: string | null
  scenes?: Pick<GeneratedScene, 'description' | 'title'>[]
  captions?: string | null
  captionLines?: string[] | null
}

export type ResolvedProjectTranscript = {
  text: string | null
  source: ProjectTranscriptSource | null
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function sceneNarrations(scenes: ProjectTranscriptInput['scenes']): string | null {
  if (!scenes?.length) return null
  const lines = scenes
    .map((scene) => nonEmpty(scene.description) || nonEmpty(scene.title))
    .filter((line): line is string => Boolean(line))
  return lines.length ? lines.join('\n\n') : null
}

function captionText(
  captions?: string | null,
  captionLines?: string[] | null
): string | null {
  const fromLines = captionLines?.map((line) => line.trim()).filter(Boolean).join('\n')
  if (fromLines) return fromLines
  return nonEmpty(captions)
}

/** Resolve display transcript using Mugtee priority order. */
export function resolveProjectTranscript(
  input: ProjectTranscriptInput
): ResolvedProjectTranscript {
  const original = nonEmpty(input.originalTranscript)
  if (original) return { text: original, source: 'original_transcript' }

  const script = nonEmpty(input.script)
  if (script) return { text: script, source: 'script' }

  const scenes = sceneNarrations(input.scenes)
  if (scenes) return { text: scenes, source: 'scenes' }

  const captions = captionText(input.captions, input.captionLines)
  if (captions) return { text: captions, source: 'captions' }

  return { text: null, source: null }
}

export const TRANSCRIPT_SOURCE_LABEL: Record<ProjectTranscriptSource, string> = {
  original_transcript: 'Voice transcript',
  script: 'Script / voiceover',
  scenes: 'Scene narrations',
  captions: 'Captions',
}
