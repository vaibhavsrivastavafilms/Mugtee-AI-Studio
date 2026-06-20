import { NextRequest, NextResponse } from 'next/server'
import { getRenderJob } from '@/lib/video/job-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {const { jobId } = await params
  
  const job = getRenderJob(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  return NextResponse.json(job)
}
