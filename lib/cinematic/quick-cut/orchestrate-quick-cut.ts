import { v4 as uuidv4 } from 'uuid'
import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import {
  ensureScenesHaveImagePrompts,
  extractCharacterDescription,
  scenesToStore,
  scenesWithCharacterImagePrompts,
  storeScenesToGenerated,
} from '@/lib/cinematic/generation'
import { generateSceneImages } from '@/lib/cinematic/generate-scene-images'
import {
  applyBlueprintsToScenes,
  buildBlueprintsForScenes,
} from '@/lib/cinematic/scene-blueprint'
import { prepareCinematicVoiceover } from '@/lib/cinematic/execution/cinematic-voice-engine'
import {
  buildCompileFilmPlan,
  buildCinematicRenderBlueprint,
  blueprintPresenceLine,
  buildPreviewRhythmFromBlueprint,
  projectStateToGenerationOutput,
} from '@/lib/cinematic/render'
import { buildEmotionalPreviewRhythm, mergePreviewRhythm } from '@/lib/cinematic/preview/emotional-preview-rhythm'
import type { CinematicScene, CinematicVoice } from '@/stores/cinematic-project'
import { runScriptGeneration } from '@/lib/cinematic/quick-cut/run-script-generation'
import { synthesizeQuickCutVoice } from '@/lib/cinematic/quick-cut/synthesize-voice'
import { orchestrateFacelessVideo } from '@/lib/video/orchestrate-faceless-video'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { coerceDuration, coerceTone } from '@/lib/workspace/validation'
import type { QuickCutPipelineStatus } from '@/lib/cinematic/quick-cut/pipeline-status'
import { buildPipelineStatus } from '@/lib/cinematic/quick-cut/pipeline-status.server'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'

export type QuickCutInput = {
  prompt: string
  style?: string
  duration?: number
  imageNote?: string
  voiceNote?: string
  keywords?: string[]
  transcript?: string
  language?: import('@/lib/cinematic/language-detection').ProjectLanguage
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
  savedProjectId?: string | null
  language?: import('@/lib/cinematic/language-detection').ProjectLanguage
  visualStyle?: import('@/lib/cinematic/workflow-state').VisualStyle
  viralScript?: import('@/lib/cinematic/workflow-state').ViralScript
  variationHistory?: import('@/lib/cinematic/variation-history').VariationHistory
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

async function attachSceneImages(
  scenes: CinematicScene[],
  ctx: {
    script: string
    hook: string
    niche: CinematicGenerationOutput['niche']
    style: string
    emotionalGoal?: string
    userId: string
  }
): Promise<{ scenes: CinematicScene[]; frames: string[]; mock: boolean }> {
  const generated = storeScenesToGenerated(scenes)
  const characterDescription = extractCharacterDescription(ctx.script, generated)
  const sceneBlueprints = buildBlueprintsForScenes(generated, {
    script: ctx.script,
    characterDescription,
  })
  const withBlueprints = applyBlueprintsToScenes(generated, sceneBlueprints)
  const withPrompts = scenesWithCharacterImagePrompts(withBlueprints, {
    characterDescription,
    hook: ctx.hook,
    emotionalGoal: ctx.emotionalGoal,
    total: withBlueprints.length,
  })

  const result = await generateSceneImages({
    scenes: withPrompts,
    sceneBlueprints,
    characterDescription,
    hook: ctx.hook,
    script: ctx.script,
    niche: ctx.niche,
    style: ctx.style,
    userId: ctx.userId,
  })

  const patchById = new Map(result.scenes.map((s) => [s.id, s]))
  const updated = scenes.map((scene) => {
    const patch = patchById.get(scene.id)
    if (!patch) return scene
    return {
      ...scene,
      imageUrl: patch.imageUrl ?? scene.imageUrl,
      imagePrompt: patch.imagePrompt || scene.imagePrompt,
    }
  })

  const frames = updated
    .map((s) => s.imageUrl)
    .filter((url): url is string => Boolean(url?.trim()))

  return { scenes: updated, frames, mock: result.mock }
}

export async function orchestrateQuickCut(
  input: QuickCutInput,
  userId: string
): Promise<QuickCutOrchestrationResult> {
  const style = coerceTone(input.style)
  const duration = coerceDuration(input.duration)
  const prompt = appendContextNotes(input.prompt, input.imageNote, input.voiceNote, input.keywords)
  const sessionId = `quick-cut-${uuidv4()}`

  const { output: rawOutput, mock: scriptMock, virlo, language } = await runScriptGeneration({
    topic: prompt,
    tone: style,
    duration,
    platform: 'instagram_reel',
    sessionSeed: sessionId,
    transcript: input.transcript,
    voiceNote: input.voiceNote,
    language: input.language,
  })

  let scenes = scenesToStore(ensureScenesHaveImagePrompts(rawOutput.scenes))
  const { scenes: withImages, frames, mock: frameMock } = await attachSceneImages(scenes, {
    script: rawOutput.script,
    hook: rawOutput.hook,
    niche: rawOutput.niche,
    style,
    emotionalGoal: virlo?.emotionalGoal,
    userId,
  })
  scenes = withImages

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

  if (isVideoRenderEnabled()) {
    try {
      const renderResult = await orchestrateFacelessVideo(
        {
          idea: prompt,
          title: projectState.title,
          script: projectState.script,
          scenes: storeScenesToGenerated(scenes),
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
    language,
    videoUrl,
    voiceUrl: voiceSynth.audioUrl,
  }
}
