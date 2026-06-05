import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { verifyDirectorProject } from '@/lib/director/director-db.server'
import {
  loadProducerApproved,
  loadProducerReport,
} from '@/lib/director/producer/producer-db.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const userId = auth.user!.id
    const project = await verifyDirectorProject(projectId, userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const [report, producerApproved] = await Promise.all([
      loadProducerReport(projectId, userId),
      loadProducerApproved(projectId, userId),
    ])

    return NextResponse.json({
      report,
      producerApproved,
    })
  } catch (err) {
    logError('director.producer.report', err)
    return NextResponse.json({ error: 'Failed to load producer report' }, { status: 500 })
  }
}
