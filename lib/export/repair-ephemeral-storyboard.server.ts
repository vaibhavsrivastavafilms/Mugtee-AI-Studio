import 'server-only'

import type { CinematicScene } from '@/stores/cinematic-project'
import { backfillStoryboardAssetsForProject } from '@/lib/storyboard/backfill-storyboard-assets.server'

/** @deprecated Use backfillStoryboardAssetsForProject — thin wrapper for export repair. */
export async function repairEphemeralStoryboardScenes(params: {
  userId: string
  projectId: string
  scenes: CinematicScene[]
}): Promise<{ scenes: CinematicScene[]; repaired: number }> {
  const result = await backfillStoryboardAssetsForProject({
    row: { id: params.projectId, scenes: params.scenes, storyboard: params.scenes },
    userId: params.userId,
    persistScenes: false,
    allowRegenerate: true,
  })
  return {
    scenes: result.scenes,
    repaired: result.repaired + result.regenerated + result.recoveredFromAssets,
  }
}
