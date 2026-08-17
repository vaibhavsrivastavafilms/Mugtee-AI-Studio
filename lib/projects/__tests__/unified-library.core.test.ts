import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildProjectActions,
  mapV7UnifiedStatus,
  matchesSearch,
  matchesStatusFilter,
  sortProjects,
} from '@/lib/projects/unified-library.core'
import { v7HasDeliverableMedia } from '@/lib/v7/deliverable-media.core'
import type { UnifiedProjectItem } from '@/lib/projects/unified-library.types'

function sampleItem(overrides: Partial<UnifiedProjectItem> = {}): UnifiedProjectItem {
  return {
    id: 'prod-1',
    title: 'Monsoon Food — Table Tales',
    prompt: 'Create a cinematic reel about monsoon food',
    type: 'v7',
    typeLabel: 'V7 Studio',
    status: 'completed',
    statusLabel: 'Completed',
    currentStage: null,
    currentTask: null,
    progress: 100,
    pausedReason: null,
    pausedDetail: null,
    retryAvailable: false,
    thumbnailUrl: 'https://cdn.example/thumb.jpg',
    reelUrl: 'https://cdn.example/reel.mp4',
    movUrl: null,
    creatorPackUrl: null,
    createdAt: '2026-08-17T10:00:00.000Z',
    updatedAt: '2026-08-17T10:30:00.000Z',
    completedAt: '2026-08-17T10:30:00.000Z',
    route: '/studio/prod-1',
    isDeliverable: true,
    actions: buildProjectActions({
      status: 'completed',
      deliverable: true,
      movUrl: null,
      creatorPackUrl: null,
      retryAvailable: false,
    }),
    ...overrides,
  }
}

describe('unified library — V7 status mapping', () => {
  it('marks deliverable export as completed', () => {
    const status = mapV7UnifiedStatus(
      {
        status: 'producing',
        reel_url: 'https://cdn.example/reel.mp4',
        export_status: 'completed',
        timeline_json: null,
      },
      false
    )
    assert.equal(status, 'completed')
    assert.equal(
      v7HasDeliverableMedia({
        status: 'producing',
        reel_url: 'https://cdn.example/reel.mp4',
        export_status: 'completed',
      }),
      true
    )
  })

  it('marks failed stage as failed', () => {
    const status = mapV7UnifiedStatus(
      { status: 'failed', reel_url: null, export_status: 'pending', timeline_json: null },
      true
    )
    assert.equal(status, 'failed')
  })

  it('marks producing as running', () => {
    const status = mapV7UnifiedStatus(
      { status: 'producing', reel_url: null, export_status: 'pending', timeline_json: null },
      false
    )
    assert.equal(status, 'running')
  })
})

describe('unified library — deliverable actions', () => {
  it('enables download only when deliverable guard passes', () => {
    const actions = buildProjectActions({
      status: 'completed',
      deliverable: true,
      movUrl: null,
      creatorPackUrl: null,
      retryAvailable: false,
    })
    assert.equal(actions.download, true)
    assert.equal(actions.watch, true)
  })

  it('does not expose download for reel without completed export', () => {
    const actions = buildProjectActions({
      status: 'running',
      deliverable: false,
      movUrl: null,
      creatorPackUrl: null,
      retryAvailable: false,
    })
    assert.equal(actions.download, false)
  })
})

describe('unified library — filters and search', () => {
  it('filters completed projects', () => {
    const completed = sampleItem({ status: 'completed' })
    const running = sampleItem({ id: 'prod-2', status: 'running', progress: 47, isDeliverable: false })
    assert.equal(matchesStatusFilter(completed, 'completed'), true)
    assert.equal(matchesStatusFilter(running, 'completed'), false)
  })

  it('filters in-progress projects', () => {
    const running = sampleItem({ status: 'running', progress: 47, isDeliverable: false })
    const draft = sampleItem({ id: 'prod-3', status: 'draft', progress: 0, isDeliverable: false })
    const completed = sampleItem({ status: 'completed' })
    assert.equal(matchesStatusFilter(running, 'in_progress'), true)
    assert.equal(matchesStatusFilter(draft, 'in_progress'), true)
    assert.equal(matchesStatusFilter(completed, 'in_progress'), false)
  })

  it('filters failed projects', () => {
    const failed = sampleItem({
      status: 'failed',
      progress: 35,
      isDeliverable: false,
      reelUrl: null,
    })
    assert.equal(matchesStatusFilter(failed, 'failed'), true)
  })

  it('searches title and prompt', () => {
    const item = sampleItem()
    assert.equal(matchesSearch(item, 'table tales'), true)
    assert.equal(matchesSearch(item, 'monsoon food'), true)
    assert.equal(matchesSearch(item, 'unrelated query'), false)
  })
})

describe('unified library — sorting', () => {
  it('sorts newest first by created_at', () => {
    const older = sampleItem({ id: 'old', createdAt: '2026-08-01T00:00:00.000Z' })
    const newer = sampleItem({ id: 'new', createdAt: '2026-08-17T00:00:00.000Z' })
    const sorted = sortProjects([older, newer], 'newest')
    assert.equal(sorted[0]?.id, 'new')
  })

  it('sorts name A–Z', () => {
    const b = sampleItem({ id: 'b', title: 'Beta reel' })
    const a = sampleItem({ id: 'a', title: 'Alpha reel' })
    const sorted = sortProjects([b, a], 'name_asc')
    assert.equal(sorted[0]?.title, 'Alpha reel')
  })
})

describe('unified library — ownership contract', () => {
  it('library items expose studio viewer route without internal ids in labels', () => {
    const id = '3b29baa9-a45b-43e4-a479-8837c285f89e'
    const item = sampleItem({ id, route: `/studio/${id}` })
    assert.equal(item.route, `/studio/${id}`)
    assert.doesNotMatch(item.statusLabel, /3b29baa9/)
  })
})
