import 'server-only'

import type { FacelessRenderInput } from '@/lib/video/types'
import { resolveMvpRoyaltyFreeMusicUrl } from '@/lib/v3/music.server'
import {
  assertProductionRenderAllowed,
  assertRealVoiceRequired,
  allowSilentVoiceFallback,
  isSlideshowOrFallbackVideo,
  slideshowVideoBlockerMessage,
} from '@/lib/v7/production-integrity.server'
import { showOnScreenText } from '@/lib/remotion/show-on-screen-text.server'
import type { V7ProductionSnapshot } from '@/types/v7/production'
import {
  buildV7ScenePackages,
  buildV7ProductionTimeline,
  buildV7TimelineFromPackages,
  countStoryboardShots,
  type V7ScenePackage,
} from '@/lib/v7/scene-package.server'
import type { V7SoundEffect } from '@/lib/v3/sound-cascade.server'
import type { RenderVideoResult } from '@/lib/video/types'
import { validateV7ProductionGrounding } from '@/lib/v7/scene-grounding.server'

const PLACEHOLDER_URL_PATTERNS = [
  /placehold\.co/i,
  /picsum\.photos/i,
  /via\.placeholder/i,
  /dummyimage\.com/i,
  /loremflickr\.com/i,
]

const GENERIC_PORTRAIT_PROMPT_PATTERNS = [
  /\bheadshot\b/i,
  /\bportrait\b/i,
  /\bpassport photo\b/i,
  /\bstock model\b/i,
]

export type V9SceneAuditRow = {
  sceneNumber: number
  sceneId: string
  durationSec: number
  image: boolean
  video: boolean
  narration: boolean
  caption: boolean
  timelineClip: boolean
  imageUrl: string | null
  videoUrl: string | null
  imageProvider: string | null
  videoProvider: string | null
  storagePath: string | null
  checkpoint: boolean
  grounded: 'YES' | 'NO'
  issues: string[]
}

export type V9TimelineAudit = {
  storyboardSceneCount: number
  storyboardShotCount: number
  generatedImageCount: number
  generatedVideoCount: number
  voiceSegmentCount: number
  captionGroupCount: number
  timelineClipCount: number
  timelineShotCount: number
  renderClipCount: number
  finalDurationSec: number
  musicPresent: boolean
  soundTrackCount: number
  countsMatch: boolean
  mismatchReasons: string[]
  warnings: string[]
}

export type V9RenderClipAudit = {
  sceneNumber: number
  sceneId: string
  videoPath: string | null
  imagePath: string | null
  captionCount: number
  durationSec: number
  duplicateVideo: boolean
  duplicateImage: boolean
  placeholder: boolean
  portraitFallback: boolean
  issues: string[]
}

export type V9StoryExecutionAudit = {
  productionId: string
  prompt: string
  passed: boolean
  blockers: string[]
  scenes: V9SceneAuditRow[]
  timeline: V9TimelineAudit
  renderClips: V9RenderClipAudit[]
  voiceUrl: string | null
  voiceResolved: boolean
  narrationTextLength: number
  subtitleCount: number
}

function isPlaceholderAssetUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  return PLACEHOLDER_URL_PATTERNS.some((pattern) => pattern.test(url))
}

function isPortraitFallbackPrompt(text: string | null | undefined): boolean {
  if (!text?.trim()) return false
  return GENERIC_PORTRAIT_PROMPT_PATTERNS.some((pattern) => pattern.test(text))
}

function packageVideoFallback(board: Record<string, unknown> | null | undefined): boolean {
  const meta = board?.videoMetadata as { fallback?: boolean; provider?: string } | undefined
  return isSlideshowOrFallbackVideo({
    provider: meta?.provider ?? (board?.animationProvider as string | undefined),
    fallback: meta?.fallback,
    videoUrl: board?.videoUrl as string | undefined,
    imageUrl: board?.imageUrl as string | undefined,
  })
}

function packageGrounded(pkg: V7ScenePackage, board: Record<string, unknown> | null | undefined): {
  grounded: 'YES' | 'NO'
  issues: string[]
} {
  const issues: string[] = []

  const archive = (board?.imageMetadata as { promptArchive?: { action?: string } } | undefined)
    ?.promptArchive
  if (!archive?.action?.trim() && !pkg.imageCheckpointAt) {
    issues.push('image not grounded to screenplay action')
  }

  if (packageVideoFallback(board)) {
    issues.push(slideshowVideoBlockerMessage(`Scene ${pkg.sceneNumber}`))
  }

  if (isPlaceholderAssetUrl(pkg.imageUrl) || isPlaceholderAssetUrl(pkg.videoUrl)) {
    issues.push('placeholder asset URL detected')
  }

  if (isPortraitFallbackPrompt(pkg.sceneDescription) && !pkg.narration.trim()) {
    issues.push('generic portrait prompt without screenplay narration')
  }

  const grounded = issues.length === 0 ? 'YES' : 'NO'
  return { grounded, issues }
}

export function auditV9ScenePackages(
  snapshot: V7ProductionSnapshot,
  packages: V7ScenePackage[]
): V9SceneAuditRow[] {
  return packages.map((pkg) => {
    const scene = snapshot.scenes.find((row) => row.id === pkg.sceneId)
    const board = (scene?.storyboard ?? null) as Record<string, unknown> | null
    const { grounded, issues } = packageGrounded(pkg, board)

    const hasImage = Boolean(pkg.imageUrl?.trim())
    const hasVideo = Boolean(pkg.videoUrl?.trim())
    const hasNarration = Boolean(pkg.narration.trim() || pkg.dialogue.trim())
    const hasCaption = pkg.captions.some((c) => c.text.trim())

    if (!hasImage) issues.push('missing image')
    if (!hasVideo) issues.push('missing video')
    if (!hasNarration) issues.push('missing narration')
    if (!hasCaption) issues.push('missing caption')
    if (!pkg.imageCheckpointAt || !pkg.videoCheckpointAt) issues.push('missing checkpoint')

    return {
      sceneNumber: pkg.sceneNumber,
      sceneId: pkg.sceneId,
      durationSec: pkg.durationSec,
      image: hasImage,
      video: hasVideo,
      narration: hasNarration,
      caption: hasCaption,
      timelineClip: hasVideo,
      imageUrl: pkg.imageUrl,
      videoUrl: pkg.videoUrl,
      imageProvider: pkg.imageProvider,
      videoProvider: pkg.videoProvider,
      storagePath: pkg.imageAssetPath,
      checkpoint: Boolean(pkg.imageCheckpointAt && pkg.videoCheckpointAt),
      grounded,
      issues: [...new Set(issues)],
    }
  })
}

export function auditV9TimelineCounts(params: {
  snapshot: V7ProductionSnapshot
  packages: V7ScenePackage[]
  renderInput?: FacelessRenderInput | null
  voiceUrl?: string | null
}): V9TimelineAudit {
  const { snapshot, packages, renderInput, voiceUrl } = params
  const editTimeline = snapshot.production.timeline_json as {
    sceneCount?: number
    scenes?: unknown[]
  } | null

  const storyboardSceneCount = snapshot.scenes.length
  const storyboardShotCount = countStoryboardShots(snapshot)
  const generatedImageCount = packages.filter((p) => p.imageUrl?.trim()).length
  const generatedVideoCount = packages.filter((p) => p.videoUrl?.trim()).length
  const captionGroupCount = packages.filter((p) => p.captions.some((c) => c.text.trim())).length
  const timelineFromProduction = snapshot.production.timeline_json as {
    shotCount?: number
    soundTracks?: unknown[]
  } | null
  const timelineFromPackages = buildV7TimelineFromPackages(packages)
  const editTimelineScenes = (timelineFromProduction as {
    scenes?: Array<{ videoUrl?: string | null; imageUrl?: string | null }>
  } | null)?.scenes
  const editTimelineClips = editTimelineScenes?.filter((s) => s.videoUrl?.trim()).length ?? 0
  const packageTimelineClips = timelineFromPackages.scenes.filter((s) => s.videoUrl?.trim()).length
  // Edit checkpoint can lag scene storyboard — trust screenplay packages when edit media is empty.
  const timelineClipCount = editTimelineClips > 0 ? editTimelineClips : packageTimelineClips
  const timelineShotCount =
    timelineFromProduction?.shotCount ??
    timelineFromPackages.shotCount ??
    packages.reduce((sum, pkg) => sum + pkg.shots.length, 0)
  const renderClipCount = renderInput?.scenes.filter((s) => s.videoUrl?.trim()).length ?? generatedVideoCount
  const voiceSegmentCount = packages.filter((p) => p.narration.trim() || p.dialogue.trim()).length
  const finalDurationSec = timelineFromPackages.durationSec
  const musicPresent = Boolean(
    snapshot.production.music_url?.trim() || resolveMvpRoyaltyFreeMusicUrl()?.trim()
  )
  const soundTrackCount =
    (timelineFromProduction?.soundTracks?.length ?? 0) ||
    buildV7ProductionTimeline({ snapshot }).soundTracks.length

  const mismatchReasons: string[] = []
  const warnings: string[] = []
  const expected = storyboardSceneCount
  const expectedShots = storyboardShotCount

  if (generatedImageCount !== expected) {
    mismatchReasons.push(`generated images (${generatedImageCount}) ≠ storyboard (${expected})`)
  }
  if (generatedVideoCount !== expected) {
    mismatchReasons.push(`generated videos (${generatedVideoCount}) ≠ storyboard (${expected})`)
  }
  if (captionGroupCount !== expected) {
    mismatchReasons.push(`caption groups (${captionGroupCount}) ≠ storyboard (${expected})`)
  }
  if (timelineClipCount !== expected) {
    mismatchReasons.push(`timeline clips (${timelineClipCount}) ≠ storyboard (${expected})`)
  }
  if (renderClipCount !== expected) {
    mismatchReasons.push(`render clips (${renderClipCount}) ≠ storyboard (${expected})`)
  }
  if (voiceSegmentCount !== expected) {
    mismatchReasons.push(`voice segments (${voiceSegmentCount}) ≠ storyboard (${expected})`)
  }
  if (timelineShotCount !== expectedShots) {
    mismatchReasons.push(`timeline shots (${timelineShotCount}) ≠ storyboard shots (${expectedShots})`)
  }
  if (!musicPresent) {
    mismatchReasons.push(
      'music missing — configure MUSICGEN_URL or MVP_ROYALTY_FREE_MUSIC_URL before export'
    )
  }
  if (soundTrackCount === 0) {
    if (process.env.AUDIOGEN_URL?.trim()) {
      mismatchReasons.push(
        'sound design missing — AudioGen is configured but produced no SFX tracks'
      )
    } else {
      warnings.push(
        'sound design missing — render will continue without environment SFX (AUDIOGEN_URL not configured)'
      )
    }
  }
  if (editTimeline?.sceneCount != null && editTimeline.sceneCount !== expected) {
    mismatchReasons.push(
      `edit timeline sceneCount (${editTimeline.sceneCount}) ≠ storyboard (${expected})`
    )
  }

  const editScenes = editTimelineScenes
  if (Array.isArray(editScenes) && editScenes.length > 0) {
    const nullMedia = editScenes.filter((row) => {
      const scene = row as { videoUrl?: string | null; imageUrl?: string | null }
      return !scene.videoUrl?.trim() && !scene.imageUrl?.trim()
    }).length
    if (nullMedia === editScenes.length && packageTimelineClips === expected) {
      warnings.push(
        'edit stage timeline has stale null media URLs — using storyboard scene packages for clip count'
      )
    }
  }

  if (!voiceUrl?.trim()) {
    warnings.push('voice file missing — render will use FFmpeg silence fallback')
  }

  return {
    storyboardSceneCount,
    storyboardShotCount,
    generatedImageCount,
    generatedVideoCount,
    voiceSegmentCount,
    captionGroupCount,
    timelineClipCount,
    timelineShotCount,
    renderClipCount,
    finalDurationSec,
    musicPresent,
    soundTrackCount,
    countsMatch: mismatchReasons.length === 0,
    mismatchReasons,
    warnings,
  }
}

export function auditV9RenderInput(renderInput: FacelessRenderInput): V9RenderClipAudit[] {
  const videoPaths = new Map<string, number>()
  const imagePaths = new Map<string, number>()

  return renderInput.scenes.map((scene, index) => {
    const videoPath = scene.videoUrl?.trim() || null
    const imagePath = scene.imageUrl?.trim() || null
    const issues: string[] = []

    if (videoPath) {
      videoPaths.set(videoPath, (videoPaths.get(videoPath) ?? 0) + 1)
    }
    if (imagePath) {
      imagePaths.set(imagePath, (imagePaths.get(imagePath) ?? 0) + 1)
    }

    const duplicateVideo = Boolean(videoPath && (videoPaths.get(videoPath) ?? 0) > 1)
    const duplicateImage = Boolean(imagePath && (imagePaths.get(imagePath) ?? 0) > 1)
    const placeholder =
      isPlaceholderAssetUrl(videoPath) || isPlaceholderAssetUrl(imagePath)
    const portraitFallback = Boolean(
      videoPath && imagePath && videoPath === imagePath
    )

    if (!videoPath) issues.push('missing video path')
    if (!scene.description?.trim()) issues.push('missing narration description for captions')
    if (duplicateVideo) issues.push('duplicate video path')
    if (duplicateImage) issues.push('duplicate image path')
    if (placeholder) issues.push('placeholder asset')
    if (portraitFallback) issues.push('video path equals image — Ken Burns still fallback')

    const sceneCaptionText = scene.description?.trim() || ''
    const captionCount =
      sceneCaptionText && renderInput.subtitles.some((sub) => sub.text.trim()) ? 1 : 0

    return {
      sceneNumber: index + 1,
      sceneId: scene.id,
      videoPath,
      imagePath,
      captionCount,
      durationSec: scene.duration ?? 0,
      duplicateVideo,
      duplicateImage,
      placeholder,
      portraitFallback,
      issues,
    }
  })
}

export function runV9StoryExecutionAudit(params: {
  snapshot: V7ProductionSnapshot
  renderInput?: FacelessRenderInput | null
  voiceUrl?: string | null
}): V9StoryExecutionAudit {
  const packages = buildV7ScenePackages(params.snapshot)
  const groundingIssues = validateV7ProductionGrounding(params.snapshot)
  const scenes = auditV9ScenePackages(params.snapshot, packages)
  const timeline = auditV9TimelineCounts({
    snapshot: params.snapshot,
    packages,
    renderInput: params.renderInput,
    voiceUrl: params.voiceUrl,
  })

  const renderClips = params.renderInput ? auditV9RenderInput(params.renderInput) : []
  const narrationTextLength = packages
    .map((p) => p.narration.trim() || p.dialogue.trim())
    .join(' ').length

  const blockers = [
    ...groundingIssues,
    ...scenes.flatMap((s) => s.issues.map((issue) => `Scene ${s.sceneNumber}: ${issue}`)),
    ...timeline.mismatchReasons,
    ...renderClips.flatMap((c) => c.issues.map((issue) => `Render clip ${c.sceneNumber}: ${issue}`)),
  ]

  if (params.renderInput && params.renderInput.subtitles.length === 0 && showOnScreenText()) {
    blockers.push('Render input has empty subtitle array')
  }

  const uniqueBlockers = [...new Set(blockers)]

  return {
    productionId: params.snapshot.production.id,
    prompt: params.snapshot.production.prompt,
    passed: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    scenes,
    timeline,
    renderClips,
    voiceUrl: params.voiceUrl ?? params.snapshot.production.voice_url,
    voiceResolved: Boolean(
      params.voiceUrl?.trim() || params.snapshot.production.voice_url?.trim()
    ),
    narrationTextLength,
    subtitleCount: params.renderInput?.subtitles.length ?? 0,
  }
}

/** @deprecated Use logV92Report */
export function logV9DebugReport(audit: V9StoryExecutionAudit): void {
  logV92Report(audit)
}

export function assertV9StoryExecutionReady(audit: V9StoryExecutionAudit): void {
  if (audit.passed) return
  throw new Error(`Story execution audit failed: ${audit.blockers.join('; ')}`)
}

export function validateV92RenderedMovie(params: {
  audit: V9StoryExecutionAudit
  renderResult: RenderVideoResult
  expectedDurationSec: number
}): string[] {
  const issues: string[] = []
  const { renderResult, expectedDurationSec } = params

  if (!renderResult.videoUrl?.trim()) {
    issues.push('render output missing video URL')
  }
  if (renderResult.durationSec <= 0) {
    issues.push('render duration invalid')
  }
  if (Math.abs(renderResult.durationSec - expectedDurationSec) > Math.max(8, expectedDurationSec * 0.35)) {
    issues.push(
      `render duration (${Math.round(renderResult.durationSec)}s) differs from screenplay (${Math.round(expectedDurationSec)}s)`
    )
  }
  if (params.audit.subtitleCount === 0 && showOnScreenText()) {
    issues.push('captions not included in render input')
  }
  if (params.audit.narrationTextLength === 0) {
    issues.push('narration missing from screenplay')
  }
  if (
    params.audit.narrationTextLength > 0 &&
    !params.audit.voiceResolved &&
    !allowSilentVoiceFallback()
  ) {
    issues.push('voiceover file missing — silent renders are not permitted')
  }
  if (renderResult.mock) {
    issues.push('mock MP4 render is not permitted')
  }

  return issues
}

/** Developer-only V9.2 report — never surfaced in UI. */
export function logV92Report(audit: V9StoryExecutionAudit): void {
  const timeline = audit.timeline

  for (const scene of audit.scenes) {
    console.info(
      '[V9.2_REPORT]',
      JSON.stringify({
        scene: String(scene.sceneNumber).padStart(2, '0'),
        image: scene.image ? 'YES' : 'NO',
        video: scene.video ? 'YES' : 'NO',
        voice: audit.voiceResolved ? 'YES' : 'NO',
        music: timeline.musicPresent ? 'YES' : 'NO',
        sfx: timeline.soundTrackCount > 0 ? 'YES' : 'NO',
        caption: scene.caption ? 'YES' : 'NO',
        timeline: scene.timelineClip ? 'YES' : 'NO',
        durationSec: scene.durationSec,
        provider: scene.videoProvider ?? scene.imageProvider ?? 'unknown',
        grounded: scene.grounded,
        issues: scene.issues,
      })
    )
  }

  console.info(
    '[V9.2_REPORT]',
    JSON.stringify({
      summary: true,
      productionId: audit.productionId,
      prompt: audit.prompt.slice(0, 140),
      storyboardScenes: timeline.storyboardSceneCount,
      storyboardShots: timeline.storyboardShotCount,
      generatedImages: timeline.generatedImageCount,
      generatedVideos: timeline.generatedVideoCount,
      narrationSegments: timeline.voiceSegmentCount,
      captionGroups: timeline.captionGroupCount,
      timelineClips: timeline.timelineClipCount,
      timelineShots: timeline.timelineShotCount,
      renderClips: timeline.renderClipCount,
      movieDurationSec: timeline.finalDurationSec,
      movieResolution: '1920x1080',
      movieFps: 30,
      musicPresent: timeline.musicPresent,
      soundTrackCount: timeline.soundTrackCount,
      voiceResolved: audit.voiceResolved,
      subtitleCount: audit.subtitleCount,
      passed: audit.passed,
      blockers: audit.blockers,
      warnings: timeline.warnings,
    })
  )

  if (!audit.passed) {
    console.warn(
      '[V9.2_REPORT]',
      `Blocked — ${audit.blockers.slice(0, 6).join('; ')}${audit.blockers.length > 6 ? '…' : ''}`
    )
  }
}
