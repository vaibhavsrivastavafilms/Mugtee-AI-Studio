import type { V7ProductionRow } from '@/types/v7/production'

import {
  mergeWorkspaceState,
  type PreservedDeliverableRefs,
  type V7WorkspaceTimelineState,
} from '@/lib/v7/workspace/workspace-state.core'

export type { PreservedDeliverableRefs } from '@/lib/v7/workspace/workspace-state.core'

export function snapshotDeliverableRefs(
  production: Pick<
    V7ProductionRow,
    | 'export_status'
    | 'reel_url'
    | 'thumbnail_url'
    | 'mov_url'
    | 'creator_pack_url'
    | 'voice_url'
    | 'music_url'
  >
): PreservedDeliverableRefs {
  return {
    export_status: production.export_status,
    reel_url: production.reel_url,
    thumbnail_url: production.thumbnail_url,
    mov_url: production.mov_url,
    creator_pack_url: production.creator_pack_url,
    voice_url: production.voice_url,
    music_url: production.music_url,
  }
}

export function hasAnyDeliverableRef(refs: PreservedDeliverableRefs): boolean {
  return Boolean(
    refs.reel_url?.trim() ||
      refs.thumbnail_url?.trim() ||
      refs.mov_url?.trim() ||
      refs.creator_pack_url?.trim() ||
      refs.voice_url?.trim() ||
      refs.music_url?.trim()
  )
}

/** Script edit marks downstream stale without clearing existing deliverable URLs. */
export function buildScriptEditProductionPatch(params: {
  timelineJson: Record<string, unknown> | null | undefined
  nextWorkspace: V7WorkspaceTimelineState
  preservedDeliverables: PreservedDeliverableRefs
}): { timeline_json: Record<string, unknown> } {
  return {
    timeline_json: mergeWorkspaceState(params.timelineJson, {
      ...params.nextWorkspace,
      preservedDeliverables: params.preservedDeliverables,
      keptExistingOutputsAt: null,
    }),
  }
}

/** Keep existing outputs: retain stale markers and restore deliverables if they were cleared. */
export function buildKeepExistingProductionPatch(params: {
  timelineJson: Record<string, unknown> | null | undefined
  workspace: V7WorkspaceTimelineState
  now: string
  production: Pick<
    V7ProductionRow,
    | 'export_status'
    | 'reel_url'
    | 'thumbnail_url'
    | 'mov_url'
    | 'creator_pack_url'
    | 'voice_url'
    | 'music_url'
  >
}): {
  timeline_json: Record<string, unknown>
  deliverablePatch: Partial<PreservedDeliverableRefs>
} {
  const preserved = params.workspace.preservedDeliverables
  const deliverablePatch: Partial<PreservedDeliverableRefs> = {}

  if (preserved) {
    if (!params.production.reel_url?.trim() && preserved.reel_url?.trim()) {
      deliverablePatch.reel_url = preserved.reel_url
    }
    if (!params.production.thumbnail_url?.trim() && preserved.thumbnail_url?.trim()) {
      deliverablePatch.thumbnail_url = preserved.thumbnail_url
    }
    if (!params.production.mov_url?.trim() && preserved.mov_url?.trim()) {
      deliverablePatch.mov_url = preserved.mov_url
    }
    if (!params.production.creator_pack_url?.trim() && preserved.creator_pack_url?.trim()) {
      deliverablePatch.creator_pack_url = preserved.creator_pack_url
    }
    if (!params.production.voice_url?.trim() && preserved.voice_url?.trim()) {
      deliverablePatch.voice_url = preserved.voice_url
    }
    if (!params.production.music_url?.trim() && preserved.music_url?.trim()) {
      deliverablePatch.music_url = preserved.music_url
    }
    if (params.production.export_status !== preserved.export_status) {
      deliverablePatch.export_status = preserved.export_status
    }
  }

  return {
    timeline_json: mergeWorkspaceState(params.timelineJson, {
      ...params.workspace,
      keptExistingOutputsAt: params.now,
    }),
    deliverablePatch,
  }
}
