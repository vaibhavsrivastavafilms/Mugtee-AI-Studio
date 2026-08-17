import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  isProductionCancelled,
  isProjectClosed,
  mergeWorkspaceState,
  readWorkspaceState,
  resolveWorkspaceLifecycleStatus,
  workspaceLifecycleLabel,
} from '@/lib/v7/workspace/workspace-state.core'

describe('workspace-state.core', () => {
  it('reads and merges workspace state from timeline_json', () => {
    const merged = mergeWorkspaceState(null, { closedAt: '2026-08-17T00:00:00.000Z' })
    const workspace = readWorkspaceState(merged)
    assert.equal(isProjectClosed(workspace), true)
    assert.equal(isProductionCancelled(workspace), false)
  })

  it('resolves cancelled before running', () => {
    const status = resolveWorkspaceLifecycleStatus({
      production: { status: 'producing', reel_url: null, export_status: 'pending' },
      stages: [],
      workspace: { cancelledAt: '2026-08-17T00:00:00.000Z' },
    })
    assert.equal(status, 'cancelled')
    assert.equal(workspaceLifecycleLabel(status), 'Cancelled')
  })

  it('resolves stale when markers exist', () => {
    const status = resolveWorkspaceLifecycleStatus({
      production: {
        status: 'completed',
        reel_url: 'https://example.com/reel.mp4',
        export_status: 'completed',
      },
      stages: [],
      workspace: {
        staleStages: {
          render: {
            stageId: 'render',
            label: 'Rendering',
            reason: 'Script updated',
            staleAt: '2026-08-17T00:00:00.000Z',
          },
        },
      },
    })
    assert.equal(status, 'stale')
  })
})
