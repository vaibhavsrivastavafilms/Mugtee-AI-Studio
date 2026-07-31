/**
 * Quality Engine — never declare export success until assets verify.
 */

import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { ExportArtifact, ExportArtifactId } from '@/lib/production-os/v3/types'

export type QualityEngineInput = {
  scenes: GeneratedScene[]
  voiceUrl: string | null
  musicUrl?: string | null
  captionsPresent: boolean
  videoUrl: string | null
  thumbnailUrl: string | null
  posterUrl?: string | null
  durationSec: number
  /** Local MP4 bytes when available (server). */
  mp4Bytes?: number | null
  requireSceneVideos?: boolean
}

export type QualityCheckResult = {
  id: string
  label: string
  ok: boolean
  severity: 'block' | 'warn'
  detail?: string
  repairHint?: string
}

export type QualityEngineReport = {
  ok: boolean
  checks: QualityCheckResult[]
  failedSceneIds: string[]
  artifacts: ExportArtifact[]
  readyForSuccessScreen: boolean
}

function sceneHasImage(s: GeneratedScene): boolean {
  return Boolean(s.imageUrl?.trim() || s.imageAssetPath?.trim())
}

function sceneHasVideo(s: GeneratedScene): boolean {
  return Boolean(s.videoUrl?.trim())
}

export function runQualityEngine(input: QualityEngineInput): QualityEngineReport {
  const failedSceneIds: string[] = []
  const checks: QualityCheckResult[] = []

  const imagesDone = input.scenes.filter(sceneHasImage).length
  const imagesOk = input.scenes.length > 0 && imagesDone === input.scenes.length
  checks.push({
    id: 'images',
    label: 'Images generated',
    ok: imagesOk,
    severity: 'block',
    detail: `${imagesDone} / ${input.scenes.length}`,
    repairHint: imagesOk ? undefined : 'Regenerate missing scene images',
  })
  if (!imagesOk) {
    input.scenes.forEach((s) => {
      if (!sceneHasImage(s)) failedSceneIds.push(s.id)
    })
  }

  const videosDone = input.scenes.filter(sceneHasVideo).length
  if (input.requireSceneVideos) {
    const videosOk = videosDone === input.scenes.length && input.scenes.length > 0
    checks.push({
      id: 'animation_clips',
      label: 'Animation complete',
      ok: videosOk,
      severity: 'block',
      detail: `${videosDone} / ${input.scenes.length} scenes`,
      repairHint: videosOk ? undefined : 'Re-animate failed scenes only',
    })
    if (!videosOk) {
      input.scenes.forEach((s) => {
        if (!sceneHasVideo(s)) failedSceneIds.push(s.id)
      })
    }
  } else {
    checks.push({
      id: 'animation_motion',
      label: 'Camera animation assigned',
      ok: true,
      severity: 'warn',
      detail: 'Cinematic Ken Burns + particles (Camera Director V3)',
    })
  }

  checks.push({
    id: 'voice',
    label: 'Voice synchronised',
    ok: Boolean(input.voiceUrl?.trim()),
    severity: 'warn',
    detail: input.voiceUrl?.trim() ? 'Present' : 'Continuing without narration',
  })

  checks.push({
    id: 'music',
    label: 'Music present',
    ok: Boolean(input.musicUrl?.trim()),
    severity: 'warn',
    detail: input.musicUrl?.trim() ? 'Present' : 'Score optional',
  })

  checks.push({
    id: 'captions',
    label: 'Captions timed',
    ok: input.captionsPresent,
    severity: 'warn',
  })

  checks.push({
    id: 'continuity',
    label: 'Scene continuity',
    ok: input.scenes.length >= 2,
    severity: 'warn',
  })

  const mp4Ok =
    Boolean(input.videoUrl?.trim()) &&
    (input.mp4Bytes == null || input.mp4Bytes > 1024)
  checks.push({
    id: 'mp4',
    label: 'MP4 export verified',
    ok: mp4Ok,
    severity: 'block',
    detail: input.mp4Bytes != null ? `${input.mp4Bytes} bytes` : undefined,
    repairHint: mp4Ok ? undefined : 'Re-run render — file missing or empty',
  })

  const thumbOk = Boolean(input.thumbnailUrl?.trim() || input.posterUrl?.trim())
  checks.push({
    id: 'thumbnail',
    label: 'Thumbnail / poster',
    ok: thumbOk,
    severity: 'block',
    repairHint: thumbOk ? undefined : 'Generate poster from best frame',
  })

  checks.push({
    id: 'duration',
    label: 'Duration valid',
    ok: input.durationSec > 0 && input.durationSec <= 180,
    severity: 'block',
  })

  const artifacts = buildArtifactChecklist(input)
  const blockingFailed = checks.some((c) => !c.ok && c.severity === 'block')
  const artifactsOk = artifacts
    .filter((a) => a.id === 'mp4' || a.id === 'thumbnail' || a.id === 'poster')
    .every((a) => a.verified)

  return {
    ok: !blockingFailed && artifactsOk,
    checks,
    failedSceneIds: [...new Set(failedSceneIds)],
    artifacts,
    readyForSuccessScreen: !blockingFailed && artifactsOk,
  }
}

function buildArtifactChecklist(input: QualityEngineInput): ExportArtifact[] {
  const mk = (
    id: ExportArtifactId,
    pathOrUrl: string | null,
    required: boolean
  ): ExportArtifact => ({
    id,
    pathOrUrl,
    verified: required ? Boolean(pathOrUrl?.trim()) : Boolean(pathOrUrl?.trim()) || !required,
    bytes: id === 'mp4' ? input.mp4Bytes ?? undefined : undefined,
    error:
      required && !pathOrUrl?.trim() ? 'Missing — do not declare success' : undefined,
  })

  return [
    mk('mp4', input.videoUrl, true),
    mk('mov', null, false),
    mk('thumbnail', input.thumbnailUrl, true),
    mk('poster', input.posterUrl ?? input.thumbnailUrl, true),
    mk('storyboard_pdf', null, false),
    mk('screenplay_pdf', null, false),
    mk('creative_brief', null, false),
    mk('research_report', null, false),
    mk('creator_pack', null, false),
  ]
}

/** Scenes that can be retried without restarting the movie. */
export function scenesNeedingRepair(
  report: QualityEngineReport,
  scenes: GeneratedScene[]
): GeneratedScene[] {
  const ids = new Set(report.failedSceneIds)
  return scenes.filter((s) => ids.has(s.id))
}
