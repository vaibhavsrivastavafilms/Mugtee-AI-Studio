import { v4 as uuidv4 } from 'uuid'
import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import {
  ensureScenesHaveImagePrompts,
  scenesToStore,
  storeScenesToGenerated,
} from '@/lib/cinematic/generation'
import { prepareCinematicVoiceover } from '@/lib/cinematic/execution/cinematic-voice-engine'
import {
  buildCompileFilmPlan,
  buildCinematicRenderBlueprint,
  blueprintPresenceLine,
  buildPreviewRhythmFromBlueprint,
  projectStateToGenerationOutput,
} from '@/lib/cinematic/render'
import { buildEmotionalPreviewRhythm, mergePreviewRhythm } from '@/lib/cinematic/preview/emotional-preview-rhythm'
import type { RegenSceneInput } from '@/lib/cinematic/regen-context'
import {
  buildPlaceholderStoryboard,
  generateSceneStoryboardImages,
  sceneVisualFromInput,
} from '@/lib/cinematic/storyboard-generator'
import type { CinematicScene, CinematicVoice } from '@/stores/cinematic-project'
import { runScriptGeneration } from '@/lib/cinematic/quick-cut/run-script-generation'
import { synthesizeQuickCutVoice } from '@/lib/cinematic/quick-cut/synthesize-voice'
import { orchestrateFacelessVideo } from '@/lib/video/orchestrate-faceless-video'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { coerceDuration, coerceTone } from '@/lib/workspace/validation'
import {
  buildPipelineStatus,
  type QuickCutPipelineStatus,
} from '@/lib/cinematic/quick-cut/pipeline-status'
import { hasImageGenerationKey } from '@/lib/ai/generate-scene-image'

const MAX_STORYBOARD_SCENES = 3
const STORYBOARD_TIMEOUT_MS = 45_000

export type QuickCutInput = {
  prompt: string
  style?: string
  duration?: number
  imageNote?: string
  voiceNote?: string
  keywords?: string[]
}

export type QuickCutOrchestrationResult = {
  output: CinematicGenerationOutput
  project: {
    title: string
    prompt: string
    style: string
    duration: number
    hook: string
    summary: string
    script: string
    scenes: CinematicScene[]
    voice: CinematicVoice | null
    captionLines: string[]
    suggestedVoiceStyle: string
    niche: string
    status: 'preview' | 'complete'
  }
  previewFrames: string[]
  previewRhythm: ReturnType<typeof mergePreviewRhythm>
  presenceLine: string
  mock: boolean
  pipeline: QuickCutPipelineStatus
  sessionId: string
  videoUrl?: string | null
  voiceUrl?: string | null
  renderPollUrl?: string | null
  renderError?: string | null
  virlo?: import('@/lib/virlo-engine/types').VirloMetadata
}

function appendContextNotes(
  prompt: string,
  imageNote?: string,
  voiceNote?: string,
  keywords?: string[]
): string {
  const parts = [prompt.trim()]
  if (keywords?.length) parts.push(`Mood keywords: ${keywords.join(', ')}`)
  if (imageNote?.trim()) parts.push(`Visual reference: ${imageNote.trim()}`)
  if (voiceNote?.trim()) parts.push(`Voice presence: ${voiceNote.trim()}`)
  return parts.filter(Boolean).join('\n\n')
}

function toRegenScenes(scenes: CinematicScene[]): RegenSceneInput[] {
  return scenes.map((s) => ({
    id: s.id,
    index: s.index,
    title: s.title,
    narration: s.narration,
    description: s.narration,
    duration: s.duration,
    visualPrompt: s.visualPrompt,
    imagePrompt: s.imagePrompt,
    cameraAngle: s.cameraAngle,
    lightingMood: s.lightingMood,
    environment: s.environment,
    colorPalette: s.colorPalette,
    movementStyle: s.movementStyle,
  }))
}

async function attachStoryboardFrames(
  scenes: CinematicScene[],
  ctx: {
    niche: CinematicGenerationOutput['niche']
    style: string
    prompt: string
    hook: string
    userId: string
    sessionId: string
  }
): Promise<{ scenes: CinematicScene[]; frames: string[]; mock: boolean }> {
  const total = scenes.length
  const regenScenes = toRegenScenes(scenes)
  const targetCount = Math.min(MAX_STORYBOARD_SCENES, scenes.length)
  let hasMockFrames = false
  const frames: string[] = []

  const updated = scenes.map((scene) => ({ ...scene }))

  for (let i = 0; i < targetCount; i++) {
    const scene = updated[i]
    const regen = regenScenes[i]
    if (!scene || !regen) continue

    const visual = sceneVisualFromInput(regen, ctx.niche, scene.index, total)
    const placeholder = buildPlaceholderStoryboard(
      scene.index,
      'Primary frame',
      visual
    )

    let primaryUrl = placeholder.url
    let sceneMock = true
    scene.storyboardImages = [placeholder]
    scene.activeStoryboardId = placeholder.id

    if (hasImageGenerationKey()) {
      try {
        const raced = await Promise.race([
          generateSceneStoryboardImages({
            input: {
              scene: regen,
              sceneIndex: scene.index,
              totalScenes: total,
              niche: ctx.niche,
              style: ctx.style,
              projectPrompt: ctx.prompt,
              hook: ctx.hook,
              allScenes: regenScenes,
            },
            userId: ctx.userId,
            projectId: ctx.sessionId,
          }),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), STORYBOARD_TIMEOUT_MS)
          ),
        ])
        if (raced && raced.images[0]?.url) {
          primaryUrl = raced.images[0].url
          sceneMock = raced.mock
          scene.storyboardImages = raced.images.slice(0, 1)
          scene.activeStoryboardId = raced.images[0].id
        }
      } catch {
        /* placeholder fallback — storyboardImages already set above */
      }
    }

    scene.imageUrl = primaryUrl
    frames.push(primaryUrl)
    if (sceneMock) hasMockFrames = true
  }

  for (let i = targetCount; i < updated.length; i++) {
    const scene = updated[i]
    const regen = regenScenes[i]
    if (!scene || !regen) continue
    const visual = sceneVisualFromInput(regen, ctx.niche, scene.index, total)
    const placeholder = buildPlaceholderStoryboard(scene.index, 'Held frame', visual)
    scene.storyboardImages = [placeholder]
    scene.activeStoryboardId = placeholder.id
    scene.imageUrl = placeholder.url
    frames.push(placeholder.url)
    hasMockFrames = true
  }

  return { scenes: updated, frames, mock: hasMockFrames }
}

function scenesToGenerated(scenes: CinematicScene[]): GeneratedScene[] {
  return ensureScenesHaveImagePrompts(storeScenesToGenerated(scenes))
}

export async function orchestrateQuickCut(
  input: QuickCutInput,
  userId: string
): Promise<QuickCutOrchestrationResult> {
  const style = coerceTone(input.style)
  const duration = coerceDuration(input.duration)
  const prompt = appendContextNotes(input.prompt, input.imageNote, input.voiceNote, input.keywords)
  const sessionId = `quick-cut-${uuidv4()}`

  const { output: rawOutput, mock: scriptMock, virlo } = await runScriptGeneration({
    topic: prompt,
    tone: style,
    duration,
    platform: 'instagram_reel',
    sessionSeed: sessionId,
  })

  let scenes = scenesToStore(ensureScenesHaveImagePrompts(rawOutput.scenes))
  const { scenes: withFrames, frames, mock: frameMock } = await attachStoryboardFrames(
    scenes,
    {
      niche: rawOutput.niche,
      style,
      prompt,
      hook: rawOutput.hook,
      userId,
      sessionId,
    }
  )
  scenes = withFrames

  const voicePrep = prepareCinematicVoiceover(
    rawOutput.script,
    rawOutput,
    rawOutput.suggestedVoiceStyle,
    duration
  )

  const voiceSynth = await synthesizeQuickCutVoice(rawOutput.script, userId)
  let voiceMock = voiceSynth.mock

  const voice: CinematicVoice = {
    voiceId: rawOutput.suggestedVoiceStyle,
    voiceName: rawOutput.suggestedVoiceStyle.replace(/_/g, ' '),
    style: rawOutput.suggestedVoiceStyle,
    narration: voicePrep.narration,
    audioUrl: voiceSynth.audioUrl ?? undefined,
  }

  const projectState = {
    title: rawOutput.title,
    prompt,
    style,
    duration,
    hook: rawOutput.hook,
    summary: rawOutput.summary,
    script: rawOutput.script,
    scenes,
    voice,
    captionLines: rawOutput.captions,
    suggestedVoiceStyle: rawOutput.suggestedVoiceStyle,
    niche: rawOutput.niche,
    status: 'preview' as const,
  }

  const filmPlan = buildCompileFilmPlan({
    title: projectState.title,
    hook: projectState.hook,
    summary: projectState.summary,
    script: projectState.script,
    scenes: projectState.scenes,
    captionLines: projectState.captionLines,
    suggestedVoiceStyle: projectState.suggestedVoiceStyle,
    niche: projectState.niche,
    duration: projectState.duration,
  })

  const blueprint = buildCinematicRenderBlueprint(filmPlan)
  const emotionalRhythm = buildEmotionalPreviewRhythm(
    projectStateToGenerationOutput(projectState).scenes,
    duration
  )
  const blueprintRhythm = buildPreviewRhythmFromBlueprint(blueprint)
  const previewRhythm = mergePreviewRhythm(emotionalRhythm, blueprintRhythm)

  let videoUrl: string | null = null
  let videoError = false

  try {
    const renderResult = await orchestrateFacelessVideo(
      {
        idea: prompt,
        title: projectState.title,
        script: projectState.script,
        scenes: scenesToGenerated(scenes),
        voiceAudioPath: null,
        voiceUrl: voiceSynth.audioUrl,
        subtitles: [],
        userId,
        projectId: sessionId,
      },
      { baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' }
    )
    videoUrl = renderResult.videoUrl
  } catch {
    videoError = true
    /* MP4 compile optional when FFmpeg unavailable */
  }

  const pipeline = buildPipelineStatus({
    scriptMock,
    imagesMock: frameMock,
    voiceMock,
    videoUrl,
    videoError,
  })

  return {
    output: projectStateToGenerationOutput(projectState),
    project: projectState,
    previewFrames: frames,
    previewRhythm,
    presenceLine: blueprintPresenceLine(blueprint),
    mock: !pipeline.live,
    pipeline,
    sessionId,
    virlo,
    videoUrl,
    voiceUrl: voiceSynth.audioUrl,
  }
}
