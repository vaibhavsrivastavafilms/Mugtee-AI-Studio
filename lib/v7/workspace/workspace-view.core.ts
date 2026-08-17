import { buildV7ScenePackages, type V7ScenePackage } from '@/lib/v7/scene-package.server'
import type { V7ProductionSnapshot, V7StageId } from '@/types/v7/production'
import { V7_STAGE_LABELS } from '@/types/v7/production'
import {
  readWorkspaceFromSnapshot,
  resolveWorkspaceLifecycleStatus,
  staleStageList,
  workspaceLifecycleLabel,
  type WorkspaceLifecycleStatus,
} from '@/lib/v7/workspace/workspace-state.core'
import {
  buildScriptReviewPayload,
  extractScriptFromStageOutput,
  type ScriptReviewPayload,
} from '@/lib/v7/workspace/workspace-script.core'
import { userFacingAffectedStageLabels } from '@/lib/v7/workspace/workspace-dependencies.core'
import { buildStageProgressList } from '@/lib/v7/production-progress'

export type WorkspaceStageNavItem = {
  stageId: V7StageId | 'final'
  label: string
  emoji: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stale'
  clickable: boolean
  /** e.g. "Duration: 12.4s" from server timestamps */
  durationLabel: string | null
  /** e.g. "Waiting", "18s elapsed", "Completed in 28s" */
  timingLabel: string | null
  /** Running-stage activity, e.g. "Generating scene 3 of 5" */
  activityLabel: string | null
  progressPercent: number | null
  progressIndeterminate: boolean
  error: string | null
  /** Short stale hint, e.g. "Edited", "Needs update" */
  staleHint: string | null
}

export type WorkspaceSceneAsset = {
  sceneId: string
  sceneNumber: number
  displayNumber: string
  narration: string
  visual: string
  camera: string
  lighting: string
  mood: string
  durationSec: number
  characters: string[]
  location: string
  imageUrl: string | null
  videoUrl: string | null
  imageStale: boolean
  videoStale: boolean
}

export type WorkspacePayload = {
  lifecycleStatus: WorkspaceLifecycleStatus
  lifecycleLabel: string
  cancelled: boolean
  closed: boolean
  staleStages: ReturnType<typeof staleStageList>
  affectedLabels: string[]
  script: ScriptReviewPayload
  voiceUrl: string | null
  voiceStale: boolean
  musicUrl: string | null
  musicStale: boolean
  reelUrl: string | null
  thumbnailUrl: string | null
  movUrl: string | null
  creatorPackUrl: string | null
  renderStale: boolean
  scenes: WorkspaceSceneAsset[]
  stageNav: WorkspaceStageNavItem[]
  brief: V7ProductionSnapshot['production']['creative_brief']
}

import {
  formatStageDurationLabel,
  resolveStaleHint,
  WORKSPACE_REVIEW_STAGE_ORDER,
} from '@/lib/v7/workspace/workspace-stage-display.core'

function isStageStale(stageId: string, staleKeys: string[]): boolean {
  return staleKeys.some((key) => key === stageId || key.startsWith(`${stageId}:`))
}

function mapStageStatus(
  snapshot: V7ProductionSnapshot,
  stageId: V7StageId,
  staleKeys: string[]
): WorkspaceStageNavItem['status'] {
  if (isStageStale(stageId, staleKeys)) return 'stale'
  const row = snapshot.stages.find((stage) => stage.stage === stageId)
  if (row?.status === 'running') return 'running'
  if (row?.status === 'completed') return 'completed'
  if (row?.status === 'failed') return 'failed'
  return 'pending'
}

function scenePackageToAsset(pkg: V7ScenePackage, staleKeys: string[]): WorkspaceSceneAsset {
  return {
    sceneId: pkg.sceneId,
    sceneNumber: pkg.sceneNumber,
    displayNumber: String(pkg.sceneNumber).padStart(2, '0'),
    narration: pkg.narration,
    visual: pkg.sceneDescription,
    camera: pkg.cameraPlan,
    lighting: pkg.lighting,
    mood: pkg.mood,
    durationSec: pkg.durationSec,
    characters: pkg.characterIds,
    location: pkg.environmentId,
    imageUrl: pkg.imageUrl,
    videoUrl: pkg.videoUrl,
    imageStale: isStageStale('image', staleKeys),
    videoStale: isStageStale('animation', staleKeys),
  }
}

export function buildWorkspacePayload(snapshot: V7ProductionSnapshot): WorkspacePayload {
  const workspace = readWorkspaceFromSnapshot(snapshot)
  const lifecycleStatus = resolveWorkspaceLifecycleStatus({
    production: snapshot.production,
    stages: snapshot.stages,
    workspace,
  })
  const staleStages = staleStageList(workspace)
  const staleKeys = Object.keys(workspace.staleStages ?? {})

  const scriptStage = snapshot.stages.find((row) => row.stage === 'script')
  const scriptDoc = extractScriptFromStageOutput(scriptStage?.output)
  const brief = snapshot.production.creative_brief

  const script = buildScriptReviewPayload({
    script: scriptDoc,
    sceneRows: snapshot.scenes,
    briefTitle: brief?.title ?? snapshot.production.title,
    hook: brief?.selectedConcept?.hook ?? null,
    callToAction: brief?.callToAction ?? null,
    durationSec: brief?.duration ?? null,
    versionId: workspace.currentScriptVersionId ?? null,
    versions: workspace.scriptVersions ?? [],
  })

  const packages = buildV7ScenePackages(snapshot)
  const progressByStage = new Map(buildStageProgressList(snapshot).map((row) => [row.stageId, row]))

  const stageNav: WorkspaceStageNavItem[] = WORKSPACE_REVIEW_STAGE_ORDER.map((stageId) => {
    if (stageId === 'final') {
      const completed = Boolean(snapshot.production.reel_url?.trim())
      const renderRow = snapshot.stages.find((stage) => stage.stage === 'render')
      const stale = isStageStale('render', staleKeys)
      return {
        stageId: 'final',
        label: 'Final Video',
        emoji: '🎬',
        status: stale ? 'stale' : completed ? 'completed' : 'pending',
        clickable: completed || stale,
        durationLabel: completed ? formatStageDurationLabel(renderRow) : null,
        timingLabel: completed ? 'Completed' : 'Waiting',
        activityLabel: null,
        progressPercent: completed ? 100 : null,
        progressIndeterminate: false,
        error: null,
        staleHint: stale ? resolveStaleHint('final') : null,
      }
    }

    const meta = V7_STAGE_LABELS[stageId]
    const status = mapStageStatus(snapshot, stageId, staleKeys)
    const row = snapshot.stages.find((stage) => stage.stage === stageId)
    const progress = progressByStage.get(stageId)
    const stale = status === 'stale'

    return {
      stageId,
      label: meta.label,
      emoji: meta.emoji,
      status,
      clickable: status === 'completed' || stale || row?.status === 'failed',
      durationLabel: status === 'completed' ? formatStageDurationLabel(row) : null,
      timingLabel: progress?.timingLabel ?? (status === 'pending' ? 'Waiting' : null),
      activityLabel:
        progress?.detailLabel && progress.detailLabel !== 'Processing…' ? progress.detailLabel : null,
      progressPercent: progress?.percent ?? null,
      progressIndeterminate: progress?.indeterminate ?? false,
      error: progress?.error ?? row?.error ?? null,
      staleHint: stale ? resolveStaleHint(stageId) : null,
    }
  })

  return {
    lifecycleStatus,
    lifecycleLabel: workspaceLifecycleLabel(lifecycleStatus),
    cancelled: Boolean(workspace.cancelledAt),
    closed: Boolean(workspace.closedAt),
    staleStages,
    affectedLabels: userFacingAffectedStageLabels(staleStages),
    script,
    voiceUrl: snapshot.production.voice_url,
    voiceStale: isStageStale('voice', staleKeys),
    musicUrl: snapshot.production.music_url,
    musicStale: isStageStale('music', staleKeys),
    reelUrl: snapshot.production.reel_url,
    thumbnailUrl: snapshot.production.thumbnail_url,
    movUrl: snapshot.production.mov_url,
    creatorPackUrl: snapshot.production.creator_pack_url,
    renderStale: isStageStale('render', staleKeys),
    scenes: packages.map((pkg) => scenePackageToAsset(pkg, staleKeys)),
    stageNav,
    brief,
  }
}
