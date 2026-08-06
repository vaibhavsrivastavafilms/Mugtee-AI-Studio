import 'server-only'



import type { GeneratedScene } from '@/lib/cinematic/generation'

import { composeReelTimeline } from '@/lib/reel/compose-reel-timeline'

import type { ReelTimeline } from '@/lib/reel/types'

import type { SubtitleSegment, FacelessRenderInput } from '@/lib/video/types'

import { pickLatestSceneImages, pickLatestSceneVideos } from '@/lib/v3/db.server'

import type {

  ProductionPlan,

  ScriptScene,

  StoryboardScene,

  V3ProjectSnapshot,

  V3ScenePromptRow,

} from '@/types/v3/production'

import type { VoiceMetadata } from '@/lib/voice/generateVoice'

import type { ReelCaptionClip } from '@/lib/remotion/reel-caption-layer'



export type V3RenderBundle = {

  scenes: GeneratedScene[]

  scriptText: string

  totalDurationSec: number

  renderInput: FacelessRenderInput

  timeline: ReelTimeline | null

  captionTracks: ReelCaptionClip[]

}



function promptBySceneId(rows: V3ScenePromptRow[]): Map<string, V3ScenePromptRow> {

  return new Map(rows.map((row) => [row.scene_id, row]))

}



/** Map V3 snapshot rows into legacy GeneratedScene shape for Remotion export. */

export function v3SnapshotToGeneratedScenes(snapshot: V3ProjectSnapshot): GeneratedScene[] {

  const latestImages = pickLatestSceneImages(snapshot.sceneImages).filter(

    (row) => row.status === 'completed' && row.image_url

  )

  const latestVideos = pickLatestSceneVideos(snapshot.sceneVideos).filter(

    (row) => row.status === 'completed' && row.video_url

  )

  const imageBySceneId = new Map(latestImages.map((row) => [row.scene_id, row]))

  const videoBySceneId = new Map(latestVideos.map((row) => [row.scene_id, row]))

  const prompts = promptBySceneId(snapshot.scenePrompts)



  return snapshot.scenes

    .slice()

    .sort((a, b) => a.number - b.number)

    .map((scene) => {

      const script = scene.script as ScriptScene

      const storyboard = scene.storyboard as StoryboardScene

      const shot = storyboard?.shots?.[0]

      const image = imageBySceneId.get(scene.id)

      const video = videoBySceneId.get(scene.id)

      const prompt = prompts.get(scene.id)



      const narration = script?.narration?.trim() ?? ''

      const imagePrompt = prompt?.image_prompt ?? narration

      const duration = Number(scene.duration ?? script?.duration ?? 6)



      return {

        id: scene.id,

        title: script?.title?.trim() || `Scene ${scene.number}`,

        description: narration,

        duration,

        visualPrompt: prompt?.video_prompt ?? imagePrompt,

        imagePrompt,

        cameraAngle: shot?.cameraAngle ?? shot?.framing ?? 'Medium shot',

        lightingMood: shot?.lighting ?? 'Cinematic natural light',

        environment: shot?.location ?? 'On location',

        colorPalette: snapshot.project.cinematic_style?.colorGrading ?? 'Warm cinematic',

        movementStyle: shot?.movement ?? snapshot.project.cinematic_style?.motionStyle ?? 'Slow push',

        imageUrl: image?.image_url ?? null,

        thumbnailUrl: image?.thumbnail_url ?? image?.image_url ?? null,

        videoUrl: video?.video_url ?? null,

        videoThumbnailUrl: video?.thumbnail_url ?? image?.thumbnail_url ?? null,

        videoProvider: video?.provider ?? null,

        videoGenerationStatus: video?.video_url ? 'ready' : 'pending',

        videoGenerationTimeMs: video?.generation_time_ms ?? null,

      } satisfies GeneratedScene

    })

}



export function buildV3ScriptText(scenes: GeneratedScene[]): string {

  return scenes.map((scene) => scene.description?.trim()).filter(Boolean).join('\n\n')

}



export function buildV3RenderBundle(params: {

  snapshot: V3ProjectSnapshot

  voiceUrl: string | null

  voiceMetadata?: VoiceMetadata | null

}): V3RenderBundle {

  const plan = params.snapshot.project.production_plan

  const scenes = v3SnapshotToGeneratedScenes(params.snapshot)

  if (scenes.length === 0) {

    throw new Error('No scenes available for export')

  }



  const scriptText = buildV3ScriptText(scenes)

  const targetDurationSec = plan?.duration ?? scenes.reduce((sum, scene) => sum + scene.duration, 0)



  const timeline = composeReelTimeline({

    scenes,

    voiceUrl: params.voiceUrl,

    voiceMetadata: params.voiceMetadata ?? null,

    script: scriptText,

    targetDurationSec,

  })



  const captionTracks = Array.isArray(params.snapshot.project.captions_json)

    ? (params.snapshot.project.captions_json as ReelCaptionClip[])

    : []



  const subtitles: SubtitleSegment[] = captionTracks.map((clip) => ({

    startSec: clip.startSec,

    endSec: clip.endSec,

    text: clip.text,

  }))



  const renderInput: FacelessRenderInput = {

    idea: params.snapshot.project.prompt,

    title: plan?.title ?? params.snapshot.project.title,

    script: scriptText,

    scenes,

    voiceAudioPath: null,

    voiceUrl: params.voiceUrl,

    subtitles,

    userId: params.snapshot.project.user_id,

    projectId: params.snapshot.project.id,

  }



  return {

    scenes,

    scriptText,

    totalDurationSec: targetDurationSec,

    renderInput,

    timeline,

    captionTracks,

  }

}



export function planSummary(plan: ProductionPlan | null) {

  return {

    duration: plan?.duration ?? 30,

    sceneCount: plan?.sceneCount ?? 5,

    language: plan?.language ?? 'English',

    style: plan?.style ?? 'Cinematic',

    aspectRatio: plan?.aspectRatio ?? '9:16',

  }

}


