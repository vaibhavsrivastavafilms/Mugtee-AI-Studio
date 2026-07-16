import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createStoryboardSignedUrl, verifyUrlHttp200 } from '@/lib/storage/signed-url.server'
import { storyboardStorageExists } from '@/lib/storyboard/storyboard-url-service.server'
import { getSceneImageAsset } from '@/lib/storage/asset-repository.server'
import { requireSupabaseServiceClient } from '@/lib/storage/service-client.server'
import type { GeneratedScene } from '@/lib/cinematic/generation'

export type StorageVerifySceneResult = {
  scene: number | string
  sceneId: string
  storageExists: boolean
  dbExists: boolean
  signedUrl: string | null
  http200: boolean
  thumbnailWorks: boolean
}

export function logStorageVerify(entry: StorageVerifySceneResult): void {
  console.info('[STORAGE_VERIFY]', JSON.stringify(entry))
}

export type StorageIntegrityReport = {
  projectId: string
  scenes: StorageVerifySceneResult[]
  allPassed: boolean
}

export async function verifyStorageIntegrity(params: {
  projectId: string
  userId: string
  scenes: Array<Pick<GeneratedScene, 'id' | 'imageAssetId' | 'imageAssetPath'>>
  supabase?: SupabaseClient
}): Promise<StorageIntegrityReport> {
  const supabase = params.supabase ?? requireSupabaseServiceClient()
  const results: StorageVerifySceneResult[] = []

  for (let i = 0; i < params.scenes.length; i++) {
    const scene = params.scenes[i]
    const asset = await getSceneImageAsset({
      projectId: params.projectId,
      sceneId: scene.id,
      assetId: scene.imageAssetId ?? undefined,
      supabase,
    })

    const storagePath = asset?.storage_path?.trim() ?? scene.imageAssetPath?.trim() ?? null
    const storageExists = storagePath ? await storyboardStorageExists(storagePath, supabase) : false
    const dbExists = Boolean(asset?.id && asset.storage_path?.trim())
    const signedUrl = storagePath ? await createStoryboardSignedUrl(storagePath, supabase) : null
    const http200 = signedUrl ? await verifyUrlHttp200(signedUrl) : false

    const entry: StorageVerifySceneResult = {
      scene: i + 1,
      sceneId: scene.id,
      storageExists,
      dbExists,
      signedUrl,
      http200,
      thumbnailWorks: http200,
    }
    logStorageVerify(entry)
    results.push(entry)

    if (asset?.id && storagePath) {
      await supabase
        .from('project_assets')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('id', asset.id)
    }
  }

  return {
    projectId: params.projectId,
    scenes: results,
    allPassed: results.every(
      (r) => r.storageExists && r.dbExists && r.http200 && r.thumbnailWorks
    ),
  }
}
