import { NextResponse } from 'next/server'

import { getAuthenticatedUser, isAuthNetworkFailure } from '@/lib/auth/server-user'
import { createLibraryTimingRecorder } from '@/lib/perf/library-timing.server'
import { fetchUnifiedProjectLibrary } from '@/lib/projects/unified-library.server'
import type {
  UnifiedLibraryPipelineFilter,
  UnifiedLibrarySort,
  UnifiedLibraryStatusFilter,
} from '@/lib/projects/unified-library.types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseStatus(value: string | null): UnifiedLibraryStatusFilter {
  const allowed: UnifiedLibraryStatusFilter[] = [
    'all',
    'completed',
    'running',
    'paused',
    'failed',
    'draft',
  ]
  return allowed.includes(value as UnifiedLibraryStatusFilter)
    ? (value as UnifiedLibraryStatusFilter)
    : 'all'
}

function parsePipeline(value: string | null): UnifiedLibraryPipelineFilter {
  const normalized = value?.replace(/-/g, '_').toLowerCase()
  const allowed: UnifiedLibraryPipelineFilter[] = [
    'all',
    'v7',
    'quick_cut',
    'cinematic',
    'v3',
  ]
  if (normalized === 'legacy') return 'v3'
  return allowed.includes(normalized as UnifiedLibraryPipelineFilter)
    ? (normalized as UnifiedLibraryPipelineFilter)
    : 'all'
}

function parseSort(value: string | null): UnifiedLibrarySort {
  const allowed: UnifiedLibrarySort[] = [
    'recently_updated',
    'newest',
    'oldest',
    'recently_completed',
  ]
  return allowed.includes(value as UnifiedLibrarySort) ? (value as UnifiedLibrarySort) : 'recently_updated'
}

export async function GET(req: Request) {
  const timing = createLibraryTimingRecorder()

  try {
    const supabase = await createSupabaseServerClient()
    let user
    try {
      const authResult = await getAuthenticatedUser(supabase)
      if (authResult.error) {
        timing.mark('auth')
        timing.finish()
        return NextResponse.json(
          { ok: false, error: 'Authentication service unavailable' },
          { status: 503 }
        )
      }
      user = authResult.user
    } catch (authErr) {
      timing.mark('auth')
      timing.finish()
      if (isAuthNetworkFailure(authErr)) {
        return NextResponse.json(
          { ok: false, error: 'Authentication service unavailable' },
          { status: 503 }
        )
      }
      throw authErr
    }
    timing.mark('auth')

    if (!user) {
      timing.finish()
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')

    const payload = await fetchUnifiedProjectLibrary({
      supabase,
      userId: user.id,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      status: parseStatus(url.searchParams.get('status')),
      pipeline: parsePipeline(url.searchParams.get('pipeline')),
      search: url.searchParams.get('q') ?? '',
      sort: parseSort(url.searchParams.get('sort')),
      timing,
    })

    timing.finish()
    return NextResponse.json(payload)
  } catch (err) {
    timing.finish()
    const message = err instanceof Error ? err.message : 'Failed to load project library'
    const status = isAuthNetworkFailure(err) ? 503 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
