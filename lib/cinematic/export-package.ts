import { captionsFromLines } from '@/lib/cinematic/regen-context'
import { NICHE_PROFILES, type CinematicNiche } from '@/lib/cinematic/niches'
import { getActiveStoryboardImage } from '@/lib/cinematic/storyboard-utils'
import { voiceStyleLabel } from '@/lib/cinematic/voice-match'
import {
  COMPILE_EXPORT_STEPS,
  buildCompileFilmPlan,
  buildCinematicRenderBlueprint,
  buildPreviewRhythmFromBlueprint,
  formatBlueprintForExport,
  orchestrateEmotionalRenderForCompile,
} from '@/lib/cinematic/render'
import type { CinematicProjectState, CinematicScene } from '@/stores/cinematic-project'

export const EXPORT_PROGRESS_STEPS = COMPILE_EXPORT_STEPS

export const CONFIDENCE_SIGNALS = [
  'Emotional pacing held',
  'Vertical film rhythm',
  'Voice timing aligned',
  'Visual continuity preserved',
] as const

export type ExportPlatformId = 'tiktok' | 'instagram' | 'youtube_shorts'

export type ExportPlatformCard = {
  id: ExportPlatformId
  name: string
  aspectRatio: string
  durationLabel: string
  visualStyle: string
  voiceStyle: string
  captionPreview: string
}

export type ExportPackageSnapshot = {
  title: string
  hook: string
  cta: string
  captionPrimary: string
  hashtags: string[]
  voiceStyle: string
  storyMood: string
  visualStyle: string
  duration: number
  sceneCount: number
  nicheLabel: string
  previewFrames: string[]
  hasStoryboards: boolean
  hasVoice: boolean
  filmRhythm: string
  presenceLine: string
  previewBeatIntervalsMs: number[]
  previewFadeMs: number
  transitionRhythm: string
}

function parseCaptions(state: Pick<CinematicProjectState, 'hook' | 'captionLines'>) {
  const pack = captionsFromLines(state.captionLines)
  const hook = state.hook.trim() || pack.primary || 'Your cinematic hook will appear here.'
  return {
    primary: pack.primary || hook,
    cta: pack.cta || 'Save this for later.',
    hashtags:
      pack.hashtags.length > 0
        ? pack.hashtags
        : ['#cinematicreel', '#mugtee'],
  }
}

function deriveStoryMood(
  summary: string,
  scenes: CinematicScene[],
  niche: string
): string {
  if (summary.trim()) {
    const sentence = summary.split(/[.!?]/)[0]?.trim()
    if (sentence && sentence.length <= 80) return sentence
    if (sentence) return `${sentence.slice(0, 77)}…`
  }

  const first = scenes[0]
  if (first?.lightingMood) return first.lightingMood
  if (first?.colorPalette) return first.colorPalette.split(/[,—]/)[0]?.trim() || first.colorPalette

  return `${NICHE_PROFILES[niche as CinematicNiche]?.label ?? niche} · cinematic arc`
}

function nicheDisplay(niche: string): string {
  return NICHE_PROFILES[niche as CinematicNiche]?.label ?? niche
}

function deriveVisualStyle(style: string, niche: string): string {
  const nicheName = nicheDisplay(niche)
  const tone = style.charAt(0).toUpperCase() + style.slice(1)
  return `${tone} · ${nicheName}`
}

export function collectPreviewFrames(scenes: CinematicScene[]): string[] {
  return scenes
    .map((scene) => getActiveStoryboardImage(scene)?.url)
    .filter((url): url is string => {
      if (!url) return false
      if (url.startsWith('data:') || url.startsWith('blob:')) return true
      return /^https?:\/\//i.test(url)
    })
    .slice(0, 6)
}

export function buildExportPackageSnapshot(
  state: Pick<
    CinematicProjectState,
    | 'title'
    | 'hook'
    | 'summary'
    | 'script'
    | 'style'
    | 'duration'
    | 'scenes'
    | 'voice'
    | 'captionLines'
    | 'suggestedVoiceStyle'
    | 'niche'
  >
): ExportPackageSnapshot {
  const captions = parseCaptions(state)
  const previewFrames = collectPreviewFrames(state.scenes)
  const voice = voiceStyleLabel(state.suggestedVoiceStyle)
  const hook = state.hook.trim() || captions.primary
  const orchestration = orchestrateEmotionalRenderForCompile(state)
  const previewRhythm = buildPreviewRhythmFromBlueprint(orchestration.blueprint)
  const alignedBeatMs =
    previewFrames.length > 0
      ? previewRhythm.beatIntervalsMs.slice(0, previewFrames.length)
      : previewRhythm.beatIntervalsMs

  return {
    title: state.title || 'Untitled cinematic story',
    hook,
    cta: captions.cta,
    captionPrimary: captions.primary,
    hashtags: captions.hashtags,
    voiceStyle: voice,
    storyMood: deriveStoryMood(state.summary, state.scenes, state.niche),
    visualStyle: deriveVisualStyle(state.style, state.niche),
    duration: state.duration,
    sceneCount: state.scenes.length,
    nicheLabel: nicheDisplay(state.niche),
    previewFrames,
    hasStoryboards: previewFrames.length > 0,
    hasVoice: Boolean(state.voice?.audioUrl || state.voice?.narration),
    filmRhythm: orchestration.blueprint.filmRhythm,
    presenceLine: orchestration.presenceLine,
    previewBeatIntervalsMs: alignedBeatMs,
    previewFadeMs: previewRhythm.fadeMs,
    transitionRhythm: previewRhythm.transitionRhythm,
  }
}

export function buildPlatformExportCards(
  snapshot: ExportPackageSnapshot
): ExportPlatformCard[] {
  const captionPreview =
    snapshot.captionPrimary.length > 72
      ? `${snapshot.captionPrimary.slice(0, 69)}…`
      : snapshot.captionPrimary

  const durationLabel = `${snapshot.duration}s vertical`

  const base = {
    aspectRatio: '9:16',
    durationLabel,
    visualStyle: snapshot.visualStyle,
    voiceStyle: snapshot.voiceStyle,
    captionPreview,
  }

  return [
    { id: 'tiktok', name: 'TikTok Reel', ...base },
    { id: 'instagram', name: 'Instagram Reel', ...base },
    { id: 'youtube_shorts', name: 'YouTube Shorts', ...base },
  ]
}

export function buildCaptionPackageText(snapshot: ExportPackageSnapshot): string {
  return [
    snapshot.hook,
    '',
    snapshot.captionPrimary,
    '',
    snapshot.cta,
    '',
    snapshot.hashtags.join(' '),
  ]
    .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n')
    .trim()
}

export function buildFullExportText(
  state: Pick<
    CinematicProjectState,
    | 'title'
    | 'prompt'
    | 'hook'
    | 'summary'
    | 'script'
    | 'style'
    | 'duration'
    | 'scenes'
    | 'voice'
    | 'captionLines'
    | 'suggestedVoiceStyle'
    | 'niche'
  >
): string {
  const snapshot = buildExportPackageSnapshot(state)
  const captionBlock = buildCaptionPackageText(snapshot)
  const filmPlan = buildCompileFilmPlan(state)
  const blueprint = buildCinematicRenderBlueprint(filmPlan)
  const directionNotes = formatBlueprintForExport(blueprint)

  return [
    `# ${snapshot.title}`,
    '',
    '## Mugtee Film World',
    '',
    `Format: 9:16 · ${snapshot.duration}s · ${snapshot.visualStyle}`,
    `Voice: ${snapshot.voiceStyle}`,
    `Mood: ${snapshot.storyMood}`,
    '',
    '## Hook',
    snapshot.hook,
    '',
    '## Caption Package',
    captionBlock,
    '',
    state.summary ? `## Summary\n${state.summary}\n` : '',
    '## Script',
    state.script,
    '',
    state.scenes.length
      ? `## Scenes (${state.scenes.length})\n${state.scenes
          .map(
            (scene) =>
              `- Scene ${scene.index}: ${scene.narration || scene.title || 'Beat'}`
          )
          .join('\n')}`
      : '',
    state.voice?.narration ? `\n## Voiceover\n${state.voice.narration}` : '',
    '',
    directionNotes,
    '',
    '---',
    'Exported from Mugtee · cinematic creator studio',
  ]
    .filter(Boolean)
    .join('\n')
}
