import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { loadProjectAssetCounts } from '@/lib/export/export-readiness.server'
import { loadOwnedCinematicProject } from '@/lib/reels/export-api'
import { backfillStoryboardAssetsForProject } from '@/lib/storyboard/backfill-storyboard-assets.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST — recover/persist storyboard stills for legacy projects (pollinations URLs, etc.). */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const projectId = params.id?.trim()
    if (!projectId) {
      return NextResponse.json({ error: 'project id required' }, { status: 400 })
    }

    const row = await loadOwnedCinematicProject(projectId, auth.user!.id)
    if (!row) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const assetCounts = await loadProjectAssetCounts(projectId, auth.user!.id)
    const result = await backfillStoryboardAssetsForProject({
      row,
      userId: auth.user!.id,
      assetCounts,
      persistScenes: true,
      allowRegenerate: true,
    })

    return NextResponse.json({
      ok: true,
      projectId,
      repaired: result.repaired,
      regenerated: result.regenerated,
      recoveredFromAssets: result.recoveredFromAssets,
      persisted: result.persisted,
      sceneCount: result.scenes.length,
      scenes: result.scenes,
    })
  } catch (err) {
    logError('projects.backfill-storyboard-assets', err)
    return NextResponse.json(
      { error: 'Failed to backfill storyboard assets' },
      { status: 500 }
    )
  }
}
