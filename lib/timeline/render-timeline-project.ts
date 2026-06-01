import 'server-only'

import type { CinematicProjectRow } from '@/lib/cinematic-projects'
import { resolveProjectScenes } from '@/lib/cinematic-projects'
import { loadOwnedCinematicProject, scenesForReelExport } from '@/lib/reels/export-api'
import { orchestrateRemotionReel } from '@/lib/video/orchestrate-remotion-reel'
import { parseSceneMotionMap } from '@/lib/motion/motion-presets'
import { parseTimelineProject, type TimelineProject } from '@/types/timeline'
import {
  buildSceneMotionFromTimeline,
  timelineToGeneratedScenes,
} from '@/lib/timeline/to-remotion-props'
import type { RenderVideoResult } from '@/lib/video/types'
import type { ReelProgressCallback } from '@/lib/video/orchestrate-remotion-reel'

export type RenderTimelineOptions = {
  userId: string
  baseUrl: string
  jobId?: string
  timelineOverride?: TimelineProject | null
  includeVoiceover?: boolean
  includeCaptions?: boolean
  onProgress?: ReelProgressCallback
}

function timelineFromRow(
  row: CinematicProjectRow,
  override?: TimelineProject | null
): TimelineProject | null {
  if (override) return override
  const raw = (row as { timeline_json?: unknown }).timeline_json
  return parseTimelineProject(raw)
}

/** Load project timeline_json (or override) and render MP4 via Remotion orchestrator. */
export async function renderTimelineProject(
  projectId: string,
  options: RenderTimelineOptions
): Promise<RenderVideoResult> {
  const row = await loadOwnedCinematicProject(projectId, options.userId)
  if (!row) {
    throw new Error('Project not found')
  }

  const timeline = timelineFromRow(row, options.timelineOverride)
  const includeVoice = options.includeVoiceover !== false

  let scenes = scenesForReelExport(resolveProjectScenes(row))
  let sceneMotion = parseSceneMotionMap(row.scene_motion)

  if (timeline) {
    scenes = timelineToGeneratedScenes(timeline, scenes)
    sceneMotion = buildSceneMotionFromTimeline(timeline)
  }

  const voiceUrl = includeVoice
    ? timeline?.audioTracks.find((a) => a.type === 'voice')?.url?.trim() ??
      row.voice?.audioUrl?.trim() ??
      null
    : null

  if (includeVoice && !voiceUrl) {
    throw new Error('Voice narration is required before exporting from the timeline.')
  }

  return orchestrateRemotionReel(
    {
      idea: row.prompt || row.title || 'timeline-export',
      title: timeline?.title ?? row.title ?? 'Untitled reel',
      script: row.script || '',
      scenes,
      voiceAudioPath: null,
      voiceUrl,
      subtitles: options.includeCaptions !== false ? [] : [],
      userId: options.userId,
      projectId,
    },
    {
      jobId: options.jobId,
      baseUrl: options.baseUrl,
      musicUrl:
        timeline?.audioTracks.find((a) => a.type === 'music')?.url?.trim() ?? null,
      sceneMotion,
      onProgress: options.onProgress,
    }
  )
}

/** Convenience wrapper for API routes. */
export async function renderProject(
  projectId: string,
  userId: string,
  baseUrl: string,
  extra?: Omit<RenderTimelineOptions, 'userId' | 'baseUrl'>
): Promise<RenderVideoResult> {
  return renderTimelineProject(projectId, {
    userId,
    baseUrl,
    ...extra,
  })
}
