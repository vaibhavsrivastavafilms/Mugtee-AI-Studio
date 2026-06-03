import { MugteeEvents, emitMugteeEvent, bootstrapDefaultEventHandlers } from '@/lib/automation/event-bus'
import { createCreativeAssetFromSource } from '@/lib/assets/asset-engine'

let handlersReady = false

export async function ensureEcosystemEventHandlers() {
  if (!handlersReady) {
    handlersReady = true
    await bootstrapDefaultEventHandlers()
  }
}

export async function onExportCompletedHook(payload: {
  userId: string
  projectId?: string
  jobId?: string
}) {
  await ensureEcosystemEventHandlers()
  await emitMugteeEvent(MugteeEvents.ExportCompleted, {
    userId: payload.userId,
    projectId: payload.projectId ?? null,
    metadata: { jobId: payload.jobId },
  })
}

export async function onAssetGeneratedHook(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  userId: string,
  input: {
    type: import('@/lib/assets/types').AssetType
    title: string
    projectId?: string | null
    sourceType: string
    sourceId: string
  }
) {
  await ensureEcosystemEventHandlers()
  const assetId = await createCreativeAssetFromSource(supabase, userId, input)
  await emitMugteeEvent(MugteeEvents.AssetGenerated, {
    userId,
    projectId: input.projectId ?? null,
    assetId: assetId ?? undefined,
    metadata: { assetType: input.type, title: input.title },
  })
  return assetId
}
