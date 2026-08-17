import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildKeepExistingProductionPatch,
  buildScriptEditProductionPatch,
  snapshotDeliverableRefs,
} from '@/lib/v7/workspace/workspace-editing.core'
import { readWorkspaceState, staleStageList } from '@/lib/v7/workspace/workspace-state.core'

describe('workspace-editing.core', () => {
  const completedProduction = {
    export_status: 'completed' as const,
    reel_url: 'https://example.com/reel.mp4',
    thumbnail_url: 'https://example.com/thumb.jpg',
    mov_url: 'https://example.com/reel.mov',
    creator_pack_url: 'https://example.com/pack.zip',
    voice_url: 'https://example.com/voice.mp3',
    music_url: 'data:audio/mpeg;base64,abc',
  }

  it('script edit patch preserves deliverable refs and snapshots them in workspace', () => {
    const patch = buildScriptEditProductionPatch({
      timelineJson: { workspace: {} },
      nextWorkspace: {
        lastEditAt: '2026-08-17T00:00:00.000Z',
        lastEditType: 'script',
        staleStages: {
          voice: {
            stageId: 'voice',
            label: 'Voice',
            reason: 'Script updated',
            staleAt: '2026-08-17T00:00:00.000Z',
          },
        },
      },
      preservedDeliverables: snapshotDeliverableRefs(completedProduction),
    })

    assert.equal('reel_url' in patch, false)
    assert.equal('export_status' in patch, false)

    const workspace = readWorkspaceState(patch.timeline_json)
    assert.equal(workspace.preservedDeliverables?.reel_url, completedProduction.reel_url)
    assert.equal(workspace.preservedDeliverables?.voice_url, completedProduction.voice_url)
    assert.equal(staleStageList(workspace).length, 1)
  })

  it('keep existing retains stale markers and restores cleared deliverables', () => {
    const preserved = snapshotDeliverableRefs(completedProduction)
    const scriptEditPatch = buildScriptEditProductionPatch({
      timelineJson: { workspace: {} },
      nextWorkspace: {
        lastEditAt: '2026-08-17T00:00:00.000Z',
        lastEditType: 'script',
        staleStages: {
          render: {
            stageId: 'render',
            label: 'Rendering',
            reason: 'Script updated',
            staleAt: '2026-08-17T00:00:00.000Z',
          },
        },
        preservedDeliverables: preserved,
      },
      preservedDeliverables: preserved,
    })

    const keepPatch = buildKeepExistingProductionPatch({
      timelineJson: scriptEditPatch.timeline_json,
      workspace: readWorkspaceState(scriptEditPatch.timeline_json),
      now: '2026-08-17T00:01:00.000Z',
      production: {
        export_status: 'pending' as const,
        reel_url: null,
        thumbnail_url: null,
        mov_url: null,
        creator_pack_url: null,
        voice_url: null,
        music_url: null,
      },
    })

    assert.equal(keepPatch.deliverablePatch.reel_url, completedProduction.reel_url)
    assert.equal(keepPatch.deliverablePatch.voice_url, completedProduction.voice_url)
    assert.equal(keepPatch.deliverablePatch.export_status, completedProduction.export_status)

    const workspace = readWorkspaceState(keepPatch.timeline_json)
    assert.equal(workspace.keptExistingOutputsAt, '2026-08-17T00:01:00.000Z')
    assert.equal(staleStageList(workspace).length, 1)
  })

  it('keep existing leaves intact deliverables unchanged when URLs were never cleared', () => {
    const preserved = snapshotDeliverableRefs(completedProduction)
    const scriptEditPatch = buildScriptEditProductionPatch({
      timelineJson: { workspace: {} },
      nextWorkspace: {
        lastEditAt: '2026-08-17T00:00:00.000Z',
        lastEditType: 'script',
        staleStages: {
          render: {
            stageId: 'render',
            label: 'Rendering',
            reason: 'Script updated',
            staleAt: '2026-08-17T00:00:00.000Z',
          },
        },
        preservedDeliverables: preserved,
      },
      preservedDeliverables: preserved,
    })

    const keepPatch = buildKeepExistingProductionPatch({
      timelineJson: scriptEditPatch.timeline_json,
      workspace: readWorkspaceState(scriptEditPatch.timeline_json),
      now: '2026-08-17T00:01:00.000Z',
      production: completedProduction,
    })

    assert.deepEqual(keepPatch.deliverablePatch, {})
    assert.equal(staleStageList(readWorkspaceState(keepPatch.timeline_json)).length, 1)
  })

  it('media preservation regression: script edit + keep existing keeps reel_url available', () => {
    const preserved = snapshotDeliverableRefs(completedProduction)
    const afterEdit = buildScriptEditProductionPatch({
      timelineJson: { workspace: {} },
      nextWorkspace: {
        lastEditAt: '2026-08-17T00:00:00.000Z',
        lastEditType: 'script',
        staleStages: {
          export: {
            stageId: 'export',
            label: 'Export',
            reason: 'Script updated',
            staleAt: '2026-08-17T00:00:00.000Z',
          },
        },
        preservedDeliverables: preserved,
      },
      preservedDeliverables: preserved,
    })

    const productionAfterEdit = { ...completedProduction }
    const keepPatch = buildKeepExistingProductionPatch({
      timelineJson: afterEdit.timeline_json,
      workspace: readWorkspaceState(afterEdit.timeline_json),
      now: '2026-08-17T00:01:00.000Z',
      production: productionAfterEdit,
    })

    const finalReelUrl = keepPatch.deliverablePatch.reel_url ?? productionAfterEdit.reel_url
    assert.equal(finalReelUrl, completedProduction.reel_url)
    assert.notEqual(finalReelUrl, null)
  })
})
