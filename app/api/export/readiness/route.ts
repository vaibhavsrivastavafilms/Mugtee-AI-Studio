import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  getExportReadinessForProject,
  loadOwnedCinematicProject,
} from '@/lib/reels/export-api'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/export/readiness?projectId=…
 * Returns structured export gate — not a generic "Missing Images" string.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const projectId = req.nextUrl.searchParams.get('projectId')?.trim() ?? ''
    const includeVoiceover = req.nextUrl.searchParams.get('includeVoiceover') !== 'false'

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const row = await loadOwnedCinematicProject(projectId, auth.user!.id)
    if (!row) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const readiness = await getExportReadinessForProject(row, auth.user!.id, {
      includeVoiceover,
    })

    return NextResponse.json({
      canExport: readiness.canExport,
      imageCount: readiness.imageCount,
      requiredImages: readiness.requiredImages,
      voiceoverCount: readiness.voiceoverCount,
      assetCount: readiness.assetCount,
      sceneCount: readiness.sceneCount,
      hasVoice: readiness.hasVoice,
      missingAssets: readiness.missingAssets,
      message: readiness.message,
    })
  } catch (err) {
    logError('export.readiness.get', err)
    return NextResponse.json({ error: 'Failed to check export readiness' }, { status: 500 })
  }
}
