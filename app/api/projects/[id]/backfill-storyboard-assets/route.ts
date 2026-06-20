import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { loadProjectAssetCounts } from '@/lib/export/export-readiness.server'
import {
  findScenesMissingExportImages,
  missingScenesExportMessage,
} from '@/lib/export/scene-export-validation'
import { loadOwnedCinematicProject } from '@/lib/reels/export-api'
import { backfillStoryboardAssetsForProject } from '@/lib/storyboard/backfill-storyboard-assets.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function backfillSuccessBody(params: {
  projectId: string
  result: Awaited<ReturnType<typeof backfillStoryboardAssetsForProject>>
  recovered: boolean
  missingAssets?: Array<{
    kind: 'image'
    sceneIndex: number
    sceneId: string
    message: string
  }>
}) {
  return {
    success: true,
    recovered: params.recovered,
    ok: params.missingAssets?.length ? false : true,
    projectId: params.projectId,
    repaired: params.result.repaired,
    regenerated: params.result.regenerated,
    recoveredFromAssets: params.result.recoveredFromAssets,
    persisted: params.result.persisted,
    sceneCount: params.result.scenes.length,
    scenes: params.result.scenes,
    missingAssets: params.missingAssets ?? [],
    partialErrors: params.result.errors.length > 0 ? params.result.errors : undefined,
  }
}

/** POST — recover/persist storyboard stills for legacy projects (pollinations URLs, etc.). */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const projectId = id?.trim()
  if (!projectId) {
    return NextResponse.json(
      { success: false, recovered: false, error: 'project id required', missingAssets: [] },
      { status: 400 }
    )
  }

  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const row = await loadOwnedCinematicProject(projectId, auth.user!.id)
    if (!row) {
      return NextResponse.json(
        { success: false, recovered: false, error: 'Project not found', missingAssets: [] },
        { status: 404 }
      )
    }

    const assetCounts = await loadProjectAssetCounts(projectId, auth.user!.id)
    const result = await backfillStoryboardAssetsForProject({
      row,
      userId: auth.user!.id,
      assetCounts,
      persistScenes: true,
      allowRegenerate: true,
      attachPlaceholders: true,
    })

    const missing = findScenesMissingExportImages(result.scenes)
    const missingAssets = missing.map((m) => ({
      kind: 'image' as const,
      sceneIndex: m.index,
      sceneId: m.id,
      message: `${m.title} is missing a storyboard image.`,
    }))

    if (missing.length > 0) {
      return NextResponse.json(
        backfillSuccessBody({
          projectId,
          result,
          recovered: result.repaired + result.regenerated + result.recoveredFromAssets > 0,
          missingAssets,
        })
      )
    }

    return NextResponse.json(
      backfillSuccessBody({
        projectId,
        result,
        recovered:
          result.repaired + result.regenerated + result.recoveredFromAssets + result.placeholderAttached > 0,
      })
    )
  } catch (err) {
    logError('projects.backfill-storyboard-assets', err)
    const message = err instanceof Error ? err.message : 'Failed to backfill storyboard assets'
    return NextResponse.json(
      {
        success: false,
        recovered: false,
        ok: false,
        error: message,
        projectId,
        missingAssets: [],
        partialErrors: [message],
      },
      { status: 500 }
    )
  }
}
