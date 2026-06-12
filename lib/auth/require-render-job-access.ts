import { NextResponse } from 'next/server'
import type { RenderJobStatus } from '@/lib/video/types'

export function assertRenderJobAccess(
  job: RenderJobStatus | null | undefined,
  userId: string
): NextResponse | null {
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (job.userId && job.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
