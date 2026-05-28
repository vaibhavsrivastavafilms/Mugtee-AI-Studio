import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'
import type { CinematicRenderIntent } from '@/lib/cinematic/execution/render/cinematic-render-intent'
import type { PreviewRhythmMetadata } from '@/lib/cinematic/render/preview-rhythm'
import { buildNarrationSyncTimeline } from '@/lib/cinematic/audio/narration-sync-points'
import { buildMotionRealizationProfile } from '@/lib/cinematic/motion/motion-realization-metadata'
import { resolveFfmpegAssemblyMode } from '@/lib/cinematic/execution/render/ffmpeg-film-assembly'

export type FilmSceneSegment = {
  sceneIndex: number
  startMs: number
  durationMs: number
  transitionInMs: number
  transitionOutMs: number
  transitionType: 'cut' | 'dissolve' | 'hold'
  motionCue: string
  escalationWeight: string
  visualIdentityHeld: boolean
}

export type FilmContinuityFlags = {
  escalationPreserved: boolean
  visualIdentityThread: string
  transitionRhythmHeld: boolean
  longFormCalibrated: boolean
}

export type CinematicFilmRealization = {
  ready: boolean
  assemblyMode: 'metadata' | 'ffmpeg'
  totalDurationSec: number
  sceneSegments: FilmSceneSegment[]
  audioSync: ReturnType<typeof buildNarrationSyncTimeline>
  motionProfile: ReturnType<typeof buildMotionRealizationProfile>
  continuity: FilmContinuityFlags
  /** Internal placeholder — never surfaced in UI */
  placeholderVideoUrl?: string
  assemblyDigest: string
}

function digestSegments(segments: FilmSceneSegment[]): string {
  const payload = segments
    .map((s) => `${s.sceneIndex}:${s.startMs}:${s.durationMs}:${s.transitionType}`)
    .join('|')
  let hash = 0
  for (let i = 0; i < payload.length; i++) {
    hash = (hash * 31 + payload.charCodeAt(i)) >>> 0
  }
  return `film-${hash.toString(16).padStart(8, '0')}`
}

/** Internal film assembly — blueprint + rhythm metadata → realization spec. */
export function assembleCinematicFilm(
  blueprint: CinematicRenderBlueprint,
  rhythm: PreviewRhythmMetadata,
  intent: CinematicRenderIntent,
  options?: { projectId?: string }
): CinematicFilmRealization {
  const total = blueprint.shots.length
  const transitionFadeMs = rhythm.transitionFadeMs
  const audioSync = buildNarrationSyncTimeline(blueprint)
  const motionProfile = buildMotionRealizationProfile(blueprint, rhythm)

  let cursorMs = 0
  const sceneSegments: FilmSceneSegment[] = blueprint.shots.map((shot, i) => {
    const durationMs = shot.durationSec * 1000
    const transitionOutMs = transitionFadeMs[i] ?? rhythm.fadeMs
    const transitionInMs = i > 0 ? (transitionFadeMs[i - 1] ?? rhythm.fadeMs) : 0
    const beat = blueprint.sequence[i]
    const segment: FilmSceneSegment = {
      sceneIndex: shot.sceneIndex,
      startMs: cursorMs,
      durationMs,
      transitionInMs,
      transitionOutMs,
      transitionType: shot.transition,
      motionCue: blueprint.motionDirections[i] ?? shot.cameraMotion,
      escalationWeight: beat?.emotionalWeight ?? 'build',
      visualIdentityHeld: shot.palette === blueprint.visualIdentity.split(' · ')[0],
    }
    cursorMs += durationMs
    return segment
  })

  const weights = blueprint.sequence.map((b) => b.emotionalWeight)
  const hasPeak = weights.includes('peak')
  const escalationPreserved =
    hasPeak &&
    weights.indexOf('peak') > weights.indexOf('open') &&
    (weights.indexOf('hold') < 0 || weights.indexOf('hold') > weights.indexOf('peak'))

  const assemblyMode = resolveFfmpegAssemblyMode(intent)
  const projectSlug = options?.projectId?.slice(0, 8) ?? 'local'
  const placeholderVideoUrl =
    assemblyMode === 'ffmpeg'
      ? `/api/cinematic/render/output/${projectSlug}/${digestSegments(sceneSegments)}.mp4`
      : undefined

  return {
    ready: blueprint.ready && total >= 1,
    assemblyMode,
    totalDurationSec: blueprint.totalDuration,
    sceneSegments,
    audioSync,
    motionProfile,
    continuity: {
      escalationPreserved,
      visualIdentityThread: blueprint.continuityThread,
      transitionRhythmHeld: blueprint.transitionRhythm.length > 0,
      longFormCalibrated: total >= 10,
    },
    placeholderVideoUrl,
    assemblyDigest: digestSegments(sceneSegments),
  }
}
