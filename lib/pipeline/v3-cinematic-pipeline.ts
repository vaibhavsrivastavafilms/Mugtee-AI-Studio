import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  buildBlueprintImagePrompt,
  buildBlueprintsForScenes,
  type OutputAlignmentControls,
  type SceneBlueprint,
} from '@/lib/cinematic/scene-blueprint'
import { composeReelTimeline } from '@/lib/reel/compose-reel-timeline'
import type { ReelTimeline } from '@/lib/reel/types'
import { buildVisualBible, mergeVisualBibleIntoBlueprints } from '@/lib/cinematic/visual-bible'
import {
  formatCreativeDirectorForPrompt,
  generateCreativeDirectorBrief,
  type GenerateCreativeDirectorInput,
} from '@/lib/content-director/creative-director-brief'
import { buildSceneVideoPrompt } from '@/lib/video-providers/build-scene-video-prompt'
import { getMotionPreset, type MotionPresetId } from '@/lib/motion/motion-presets'
import type { SceneMotionMap } from '@/lib/motion/scene-motion-types'
import {
  buildVoiceDirectorPlan,
  type VoiceDirectorInput,
} from '@/lib/voice/voiceDirector'
import type { VoiceMetadata } from '@/lib/voice/generateVoice'
import { updateV3CreatorMemory } from '@/lib/memory/v3-creator-preferences'
import type { StoryBible } from '@/lib/cinematic/story-bible'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import { isV3PipelineEnabled } from '@/lib/pipeline/v3-feature-flag'
import {
  EMPTY_V3_PIPELINE_STATE,
  V3_STAGE_ORDER,
  type CreativeDirectorBrief,
  type FluxScenePrompt,
  type MotionInstructions,
  type ScenePlan,
  type ScenePlanEntry,
  type TimelineTrack,
  type TimelineTracks,
  type V3CreatorMemory,
  type V3PipelineContext,
  type V3PipelineStageId,
  type V3PipelineState,
  type V3StageOutputMap,
  type V3StageResult,
  type VoiceDirection,
} from '@/lib/pipeline/v3-types'

export type { V3PipelineContext, V3PipelineState, V3PipelineStageId, V3StageResult }
export { V3_STAGE_ORDER, EMPTY_V3_PIPELINE_STATE, isV3PipelineEnabled }

/** Maps each V3 stage to existing implementation modules. */
export const V3_STAGE_IMPLEMENTATION_MAP: Record<
  V3PipelineStageId,
  { module: string; status: 'integrated' | 'partial' | 'new' }
> = {
  creative_director: { module: 'lib/content-director/creative-director-brief.ts', status: 'integrated' },
  scene_planner: { module: 'lib/cinematic/scene-blueprint.ts + /api/generate-scenes', status: 'integrated' },
  visual_bible: { module: 'lib/cinematic/visual-bible.ts', status: 'new' },
  flux_image_engine: { module: 'lib/cinematic/scene-blueprint.ts + /api/generate-images (FluxAPI Kontext)', status: 'integrated' },
  seedance_motion: { module: 'lib/video-providers/* + lib/cinematic/scene-video-pipeline.client.ts', status: 'integrated' },
  voice_director: { module: 'lib/voice/voiceDirector.ts + /api/generate-voice', status: 'integrated' },
  timeline_composer: { module: 'lib/reel/compose-reel-timeline.ts + DirectorTimeline', status: 'partial' },
  creator_editor: { module: 'components/editor/creator-editor.tsx + store reorder/regen', status: 'partial' },
  memory_system: { module: 'lib/memory/v3-creator-preferences.ts', status: 'partial' },
  export_studio: { module: 'lib/quick-cut/creator-pack-export.client.ts', status: 'integrated' },
}

function transitionForIndex(index: number, total: number): string {
  if (index === 0) return 'hard_open'
  if (index === total - 1) return 'fade_out'
  if (index === Math.floor(total / 2)) return 'contrast_cut'
  return index % 2 === 0 ? 'fade' : 'dissolve'
}

/** Build scene plan from generated scenes + blueprints. */
export function buildScenePlan(
  scenes: GeneratedScene[],
  blueprints: SceneBlueprint[],
  pacingStyle = 'breathing room cinematic'
): ScenePlan {
  const bpMap = new Map(blueprints.map((b) => [b.sceneId, b]))
  const total = scenes.length || 1
  let cursor = 0

  const entries: ScenePlanEntry[] = scenes.map((scene, index) => {
    const bp = bpMap.get(scene.id)
    const duration = scene.duration ?? 4
    const entry: ScenePlanEntry = {
      sceneId: scene.id,
      index: index + 1,
      duration,
      visualGoal: bp?.narrativeGoal || scene.title || `Beat ${index + 1}`,
      cameraStyle: bp?.cameraAngle || scene.cameraAngle || 'Medium framing',
      transitionType: transitionForIndex(index, total),
      narration: scene.description || scene.title || '',
      emotion: bp?.emotion,
    }
    cursor += duration
    return entry
  })

  return {
    scenes: entries,
    totalDurationSec: cursor,
    pacingStyle,
  }
}

/** Build Flux Kontext prompts from blueprints + visual bible consistency pack. */
export function buildFluxScenePrompts(
  scenes: GeneratedScene[],
  blueprints: SceneBlueprint[],
  options?: { aspectRatio?: FluxScenePrompt['aspectRatio']; kontextPrefix?: string }
): FluxScenePrompt[] {
  const bpMap = new Map(blueprints.map((b) => [b.sceneId, b]))
  const aspectRatio = options?.aspectRatio ?? '9:16'
  const prefix = options?.kontextPrefix?.trim()

  return scenes.map((scene) => {
    const bp = bpMap.get(scene.id)
    const basePrompt =
      scene.imagePrompt?.trim() ||
      (bp ? buildBlueprintImagePrompt(bp, null) : scene.visualPrompt || scene.description)
    const prompt = prefix ? `${prefix} ${basePrompt}`.trim() : basePrompt

    return {
      sceneId: scene.id,
      prompt: prompt.slice(0, 900),
      aspectRatio,
      kontextNotes: bp
        ? `WHO/WHERE/WHAT/MOOD from blueprint — ${bp.emotion} ${bp.narrativeGoal}`
        : undefined,
    }
  })
}

/** Build Seedance motion instructions from blueprints + motion map. */
export function buildMotionInstructions(
  scenes: GeneratedScene[],
  blueprints: SceneBlueprint[],
  sceneMotion: SceneMotionMap = {},
  defaultPreset: MotionPresetId = 'historical_push_in'
): MotionInstructions[] {
  const bpMap = new Map(blueprints.map((b) => [b.sceneId, b]))

  return scenes.map((scene) => {
    const bp = bpMap.get(scene.id) ?? null
    const motionEntry = sceneMotion[scene.id]
    const presetId = (motionEntry?.presetId ?? scene.motionPresetId ?? defaultPreset) as MotionPresetId
    const preset = getMotionPreset(presetId)
    const prompt = buildSceneVideoPrompt(scene, bp, presetId, sceneMotion)

    return {
      sceneId: scene.id,
      cameraMotion: motionEntry?.motionType?.replace(/_/g, ' ') || bp?.cameraAngle || preset.name,
      subjectMotion: bp?.action || 'Motivated subject action',
      atmosphereMotion: bp?.lighting || 'Atmospheric depth and motivated light shift',
      prompt,
      durationSec: scene.duration ?? 5,
      motionPresetId: presetId,
    }
  })
}

/** Compose extended timeline tracks from reel timeline. */
export function buildTimelineTracks(
  reelTimeline: ReelTimeline | null,
  options?: { musicUrl?: string | null }
): TimelineTracks {
  const tracks: TimelineTrack[] = []

  if (reelTimeline) {
    tracks.push({
      kind: 'video',
      clips: reelTimeline.clips.map((clip) => ({
        id: `video-${clip.sceneId}`,
        sceneId: clip.sceneId,
        startSec: clip.startSec,
        endSec: clip.endSec,
        label: clip.title || `Scene ${clip.index}`,
        assetUrl: clip.video ?? clip.image,
        metadata: { animation: clip.animation, emotion: clip.emotion },
      })),
    })

    tracks.push({
      kind: 'voice',
      clips: reelTimeline.clips.map((clip) => ({
        id: `voice-${clip.sceneId}`,
        sceneId: clip.sceneId,
        startSec: clip.voiceSegment.startSec,
        endSec: clip.voiceSegment.endSec,
        label: clip.voiceSegment.text.slice(0, 40),
        assetUrl: reelTimeline.voiceUrl,
        metadata: { audioOffsetSec: clip.voiceSegment.audioOffsetSec },
      })),
    })

    tracks.push({
      kind: 'captions',
      clips: reelTimeline.clips.map((clip) => ({
        id: `caption-${clip.sceneId}`,
        sceneId: clip.sceneId,
        startSec: clip.caption.startSec,
        endSec: clip.caption.endSec,
        label: clip.caption.text.slice(0, 40),
        metadata: { words: clip.caption.words },
      })),
    })

    tracks.push({
      kind: 'transitions',
      clips: reelTimeline.clips.slice(0, -1).map((clip, i) => ({
        id: `transition-${clip.sceneId}`,
        sceneId: clip.sceneId,
        startSec: clip.endSec - 0.3,
        endSec: reelTimeline.clips[i + 1]?.startSec ?? clip.endSec,
        label: clip.animation.transition,
        metadata: { presetId: clip.animation.presetId },
      })),
    })

    tracks.push({
      kind: 'effects',
      clips: reelTimeline.clips.map((clip) => ({
        id: `fx-${clip.sceneId}`,
        sceneId: clip.sceneId,
        startSec: clip.startSec,
        endSec: clip.endSec,
        label: clip.animation.presetId,
        metadata: { motionType: clip.animation.motionType },
      })),
    })
  }

  if (options?.musicUrl) {
    tracks.push({
      kind: 'music',
      clips: [
        {
          id: 'music-bed',
          startSec: 0,
          endSec: reelTimeline?.totalDurationSec ?? 60,
          assetUrl: options.musicUrl,
          label: 'Background music',
        },
      ],
      muted: false,
    })
  }

  return {
    version: 1,
    reelTimeline,
    tracks,
    composedAt: new Date().toISOString(),
  }
}

export type RunV3StageOptions = {
  creativeDirectorInput?: GenerateCreativeDirectorInput
  voiceDirectorInput?: VoiceDirectorInput
  sceneMotion?: SceneMotionMap
  voiceMetadata?: VoiceMetadata | null
  outputAlignmentControls?: OutputAlignmentControls | null
  storyBible?: StoryBible | null
  visualStyle?: VisualStyle | null
  characterDescription?: string
  targetDurationSec?: number
  musicUrl?: string | null
}

/** Run a single V3 stage — integrates existing modules, no rebuild. */
export async function runV3Stage<S extends V3PipelineStageId>(
  stage: S,
  ctx: V3PipelineContext,
  options: RunV3StageOptions = {}
): Promise<V3StageResult<V3StageOutputMap[S]>> {
  const started = performance.now()

  try {
    switch (stage) {
      case 'creative_director': {
        const input: GenerateCreativeDirectorInput = options.creativeDirectorInput ?? {
          topic: ctx.topic || ctx.prompt,
          tone: ctx.tone,
          niche: ctx.niche,
          duration: ctx.duration,
          sessionSeed: ctx.sessionSeed,
          previousHooks: ctx.previousHooks,
          title: ctx.title,
          hook: ctx.hook,
          creativeBrief: undefined,
        }
        if (ctx.contentBrief) {
          input.topic = ctx.contentBrief.topic
        }
        const result = await generateCreativeDirectorBrief(input)
        return {
          stage,
          status: 'completed',
          output: result.brief as V3StageOutputMap[S],
          source: result.source,
          durationMs: result.durationMs,
        }
      }

      case 'scene_planner': {
        const scenes = ctx.scenes ?? []
        const blueprints =
          ctx.sceneBlueprints ??
          buildBlueprintsForScenes(scenes, {
            script: ctx.script,
            characterDescription: options.characterDescription,
            visualStyle: options.visualStyle ?? ctx.visualStyle,
            storyBible: options.storyBible ?? ctx.storyBible,
            controls: options.outputAlignmentControls,
          })
        const pacing =
          ctx.creatorMemory?.pacing ?? 'breathing room cinematic'
        const plan = buildScenePlan(scenes, blueprints, pacing)
        return {
          stage,
          status: scenes.length ? 'completed' : 'skipped',
          output: plan as V3StageOutputMap[S],
          source: 'existing',
          durationMs: Math.round(performance.now() - started),
        }
      }

      case 'visual_bible': {
        const blueprints = ctx.sceneBlueprints ?? []
        const bible = buildVisualBible({
          creativeBrief: ctx.creativeDirectorBrief ?? null,
          scenes: ctx.scenes,
          sceneBlueprints: blueprints,
          storyBible: options.storyBible ?? ctx.storyBible,
          visualStyle: options.visualStyle ?? ctx.visualStyle,
          characterDescription: options.characterDescription,
          controls: options.outputAlignmentControls,
        })
        return {
          stage,
          status: 'completed',
          output: bible as V3StageOutputMap[S],
          source: 'existing',
          durationMs: Math.round(performance.now() - started),
        }
      }

      case 'flux_image_engine': {
        const scenes = ctx.scenes ?? []
        const blueprints = ctx.sceneBlueprints ?? []
        const prompts = buildFluxScenePrompts(scenes, blueprints)
        return {
          stage,
          status: scenes.length ? 'completed' : 'skipped',
          output: prompts as V3StageOutputMap[S],
          source: 'existing',
          durationMs: Math.round(performance.now() - started),
        }
      }

      case 'seedance_motion': {
        const scenes = ctx.scenes ?? []
        const blueprints = ctx.sceneBlueprints ?? []
        const motion = buildMotionInstructions(
          scenes,
          blueprints,
          options.sceneMotion ?? {}
        )
        return {
          stage,
          status: scenes.length ? 'completed' : 'skipped',
          output: motion as V3StageOutputMap[S],
          source: 'existing',
          durationMs: Math.round(performance.now() - started),
        }
      }

      case 'voice_director': {
        const scenes = ctx.scenes ?? []
        if (!scenes.length) {
          return {
            stage,
            status: 'skipped',
            durationMs: Math.round(performance.now() - started),
          }
        }
        const voiceInput: VoiceDirectorInput =
          options.voiceDirectorInput ?? {
            scenes,
            sceneBlueprints: ctx.sceneBlueprints,
            niche: ctx.niche,
            tone: ctx.tone,
            contentBrief: ctx.contentBrief,
          }
        const plan = buildVoiceDirectorPlan(voiceInput)
        const direction: VoiceDirection = { ...plan, stage: 'voice_director' }
        return {
          stage,
          status: 'completed',
          output: direction as V3StageOutputMap[S],
          source: 'existing',
          durationMs: Math.round(performance.now() - started),
        }
      }

      case 'timeline_composer': {
        const reel =
          ctx.reelTimeline ??
          composeReelTimeline({
            scenes: ctx.scenes ?? [],
            sceneBlueprints: ctx.sceneBlueprints,
            sceneMotion: options.sceneMotion,
            outputAlignmentControls: options.outputAlignmentControls,
            voiceUrl: ctx.voiceUrl,
            voiceMetadata: options.voiceMetadata ?? null,
            script: ctx.script,
            targetDurationSec: options.targetDurationSec ?? ctx.duration,
          })
        const tracks = buildTimelineTracks(reel, { musicUrl: options.musicUrl })
        return {
          stage,
          status: reel ? 'completed' : 'skipped',
          output: tracks as V3StageOutputMap[S],
          source: 'existing',
          durationMs: Math.round(performance.now() - started),
        }
      }

      case 'creator_editor': {
        const order = (ctx.scenes ?? []).map((s) => s.id)
        return {
          stage,
          status: 'completed',
          output: { sceneOrder: order } as V3StageOutputMap[S],
          source: 'existing',
          durationMs: Math.round(performance.now() - started),
        }
      }

      case 'memory_system': {
        const memory = updateV3CreatorMemory(ctx.creatorMemory ?? {}, {
          hook: ctx.hook,
          niche: ctx.niche,
          tone: ctx.tone,
          visualStyle: ctx.visualStyle?.label,
          pacing: ctx.creatorMemory?.pacing,
        })
        return {
          stage,
          status: 'completed',
          output: memory as V3StageOutputMap[S],
          source: 'existing',
          durationMs: Math.round(performance.now() - started),
        }
      }

      case 'export_studio': {
        const ready = Boolean(ctx.script?.trim() && (ctx.scenes?.length ?? 0) > 0)
        return {
          stage,
          status: ready ? 'completed' : 'skipped',
          output: {
            formats: ['mp4', 'storyboard_pdf', 'voice_mp3', 'srt', 'script_txt'],
            ready,
          } as V3StageOutputMap[S],
          source: 'existing',
          durationMs: Math.round(performance.now() - started),
        }
      }

      default:
        return {
          stage,
          status: 'failed',
          error: `Unknown stage: ${stage}`,
          durationMs: Math.round(performance.now() - started),
        }
    }
  } catch (err) {
    return {
      stage,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      durationMs: Math.round(performance.now() - started),
    }
  }
}

/** Sync V3 state from post-pipeline store snapshot (non-destructive). */
export function syncV3StateFromContext(
  ctx: V3PipelineContext,
  existing: V3PipelineState = EMPTY_V3_PIPELINE_STATE
): V3PipelineState {
  const scenes = ctx.scenes ?? []
  const blueprints = ctx.sceneBlueprints ?? []
  const creativeBrief = ctx.creativeDirectorBrief ?? existing.creativeDirectorBrief
  const visualBible = buildVisualBible({
    creativeBrief,
    scenes,
    sceneBlueprints: blueprints,
    storyBible: ctx.storyBible,
    visualStyle: ctx.visualStyle,
  })
  const mergedBlueprints = mergeVisualBibleIntoBlueprints(blueprints, visualBible)
  const reel =
    ctx.reelTimeline ??
    composeReelTimeline({
      scenes,
      sceneBlueprints: mergedBlueprints,
      voiceUrl: ctx.voiceUrl,
      script: ctx.script,
      targetDurationSec: ctx.duration,
    })

  return {
    ...existing,
    enabled: true,
    creativeDirectorBrief: creativeBrief,
    scenePlan: buildScenePlan(
      scenes,
      mergedBlueprints,
      creativeBrief?.pacingStyle
    ),
    visualBible,
    fluxPrompts: buildFluxScenePrompts(scenes, mergedBlueprints),
    motionInstructions: buildMotionInstructions(scenes, mergedBlueprints),
    voiceDirection: scenes.length
      ? {
          ...buildVoiceDirectorPlan({
            scenes,
            sceneBlueprints: mergedBlueprints,
            niche: ctx.niche,
            tone: ctx.tone,
            contentBrief: ctx.contentBrief,
          }),
          stage: 'voice_director',
        }
      : null,
    timelineTracks: buildTimelineTracks(reel),
    creatorMemory: updateV3CreatorMemory(existing.creatorMemory ?? {}, {
      hook: ctx.hook ?? creativeBrief?.hook,
      niche: ctx.niche,
      tone: ctx.tone,
      visualStyle: visualBible.artStyle,
      pacing: creativeBrief?.pacingStyle,
    }),
    completedAt: scenes.length ? new Date().toISOString() : existing.completedAt,
  }
}

/** Build V3 context from content brief + pipeline fields. */
export function buildV3ContextFromBrief(
  brief: CreativeDirectorBrief,
  ctx: Partial<V3PipelineContext> = {}
): V3PipelineContext {
  return {
    prompt: ctx.prompt ?? brief.contentBrief.topic,
    topic: brief.contentBrief.topic,
    duration: ctx.duration ?? 60,
    title: brief.title,
    hook: brief.hook,
    tone: brief.visualStyle,
    contentBrief: brief.contentBrief,
    ...ctx,
  }
}

/** Prompt injection block for downstream APIs when V3 is active. */
export function v3PromptAugmentation(brief: CreativeDirectorBrief | null): string {
  if (!brief) return ''
  return formatCreativeDirectorForPrompt(brief)
}

/** Migration helper: stages that runPipeline already covers when V3 flag is off. */
export const RUNPIPELINE_TO_V3_STAGE_MAP: Record<string, V3PipelineStageId[]> = {
  analyzing: ['creative_director'],
  title: ['creative_director'],
  hook: ['creative_director'],
  script: ['creative_director', 'scene_planner'],
  scenes: ['scene_planner', 'visual_bible'],
  images: ['flux_image_engine'],
  motion: ['seedance_motion'],
  voice: ['voice_director'],
  render: ['timeline_composer'],
  complete: ['export_studio', 'memory_system'],
}
