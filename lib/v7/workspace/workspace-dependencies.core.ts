import { V7_RUNNABLE_STAGES } from '@/lib/v7/pipeline'
import type { V7StageId } from '@/types/v7/production'
import { V7_STAGE_LABELS } from '@/types/v7/production'
import type { StaleStageMarker } from '@/lib/v7/workspace/workspace-state.core'

export type WorkspaceEditSource = 'script' | 'voice' | 'scene' | 'continuation'

const SCRIPT_DOWNSTREAM: V7StageId[] = [
  'voice',
  'character',
  'world',
  'storyboard',
  'image',
  'animation',
  'music',
  'sound',
  'edit',
  'quality',
  'render',
  'export',
]

const VOICE_DOWNSTREAM: V7StageId[] = ['sound', 'edit', 'quality', 'render', 'export']

const SCENE_VISUAL_DOWNSTREAM: V7StageId[] = ['image', 'animation', 'sound']

const CONTINUATION_DOWNSTREAM: V7StageId[] = [
  'voice',
  'music',
  'sound',
  'edit',
  'quality',
  'render',
  'export',
]

const TIMELINE_DOWNSTREAM: V7StageId[] = ['edit', 'quality', 'render', 'export']

function stageLabel(stageId: V7StageId): string {
  return V7_STAGE_LABELS[stageId]?.label ?? stageId
}

export function downstreamStagesForEdit(source: WorkspaceEditSource): V7StageId[] {
  switch (source) {
    case 'script':
      return [...SCRIPT_DOWNSTREAM]
    case 'voice':
      return [...VOICE_DOWNSTREAM]
    case 'scene':
      return [...SCENE_VISUAL_DOWNSTREAM, ...TIMELINE_DOWNSTREAM]
    case 'continuation':
      return [...CONTINUATION_DOWNSTREAM]
  }
}

export function firstRegenerationStage(source: WorkspaceEditSource): V7StageId {
  switch (source) {
    case 'script':
      return 'voice'
    case 'voice':
      return 'voice'
    case 'scene':
      return 'image'
    case 'continuation':
      return 'image'
  }
}

export function buildStaleMarkers(params: {
  source: WorkspaceEditSource
  reason: string
  staleAt: string
  sceneId?: string
  sceneNumber?: number
}): StaleStageMarker[] {
  const stages = downstreamStagesForEdit(params.source)
  return stages.map((stageId) => ({
    stageId,
    label:
      params.sceneNumber != null && (stageId === 'image' || stageId === 'animation' || stageId === 'sound')
        ? `${stageLabel(stageId)} — Scene ${params.sceneNumber}`
        : stageLabel(stageId),
    reason: params.reason,
    staleAt: params.staleAt,
    sceneId: params.sceneId,
    sceneNumber: params.sceneNumber,
  }))
}

export function stagesAfter(stageId: V7StageId): V7StageId[] {
  const idx = V7_RUNNABLE_STAGES.indexOf(stageId)
  if (idx < 0) return []
  return V7_RUNNABLE_STAGES.slice(idx + 1)
}

export function userFacingAffectedStageLabels(markers: StaleStageMarker[]): string[] {
  const labels = new Set<string>()
  for (const marker of markers) {
    if (marker.stageId === 'voice') labels.add('Voice')
    else if (marker.stageId === 'storyboard') labels.add('Storyboard')
    else if (marker.stageId === 'image') labels.add(marker.sceneNumber != null ? `Images — Scene ${marker.sceneNumber}` : 'Images')
    else if (marker.stageId === 'animation') labels.add(marker.sceneNumber != null ? `Animation — Scene ${marker.sceneNumber}` : 'Animation')
    else if (marker.stageId === 'music') labels.add('Music')
    else if (marker.stageId === 'sound') labels.add(marker.sceneNumber != null ? `SFX — Scene ${marker.sceneNumber}` : 'SFX')
    else if (marker.stageId === 'edit') labels.add('Timeline')
    else if (marker.stageId === 'quality') labels.add('QA')
    else if (marker.stageId === 'render') labels.add('Render')
    else labels.add(marker.label)
  }
  return [...labels]
}
