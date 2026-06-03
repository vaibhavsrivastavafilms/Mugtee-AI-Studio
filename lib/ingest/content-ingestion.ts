import type { SupabaseClient } from '@supabase/supabase-js'
import { createCreativeAssetFromSource } from '@/lib/assets/asset-engine'

export type IngestSource = 'google_doc' | 'pdf' | 'notion' | 'drive_folder'

export type IngestItem = {
  source: IngestSource
  externalId: string
  title: string
  excerpt?: string
  metadata?: Record<string, unknown>
}

export async function ingestContentItems(
  supabase: SupabaseClient,
  userId: string,
  items: IngestItem[],
  projectId?: string | null
): Promise<{ imported: number; assetIds: string[] }> {
  const assetIds: string[] = []

  for (const item of items) {
    const id = await createCreativeAssetFromSource(supabase, userId, {
      type: 'document',
      title: item.title,
      description: item.excerpt ?? null,
      tags: [item.source, 'ingested'],
      projectId: projectId ?? null,
      sourceType: `ingest_${item.source}`,
      sourceId: item.externalId,
      metadata: { stub: true, ...item.metadata },
    })
    if (id) assetIds.push(id)
  }

  return { imported: assetIds.length, assetIds }
}

/** Stub batch import — returns synthetic items until OAuth connectors run. */
export async function ingestFromProviderStub(
  supabase: SupabaseClient,
  userId: string,
  source: IngestSource,
  query: string,
  projectId?: string | null
) {
  const items: IngestItem[] = [
    {
      source,
      externalId: `${source}-${Date.now()}`,
      title: `${query.slice(0, 80)} (${source})`,
      excerpt: `Stub import from ${source} — connect integration for live sync.`,
      metadata: { query },
    },
  ]
  return ingestContentItems(supabase, userId, items, projectId)
}
