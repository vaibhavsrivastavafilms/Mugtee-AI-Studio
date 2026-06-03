import type { SupabaseClient } from '@supabase/supabase-js'
import { callStructuredJson } from '@/lib/ai-agent/structured-llm'
import type { Asset } from '@/lib/assets/types'

type TagSuggestion = {
  tags: string[]
  themes: string[]
  campaignLabel: string | null
}

export async function suggestAssetTags(asset: Pick<Asset, 'title' | 'description' | 'type' | 'metadata'>): Promise<TagSuggestion> {
  const fallback: TagSuggestion = {
    tags: [asset.type],
    themes: [],
    campaignLabel: null,
  }
  if (!process.env.OPENAI_API_KEY?.trim() && !process.env.EMERGENT_LLM_KEY?.trim()) {
    return fallback
  }

  try {
    const raw = await callStructuredJson<TagSuggestion>({
      system: 'You tag creative assets for a short-form video studio. Output concise lowercase tags.',
      user: `Type: ${asset.type}\nTitle: ${asset.title}\nDescription: ${asset.description ?? ''}\nMetadata: ${JSON.stringify(asset.metadata).slice(0, 1500)}`,
      schemaHint: '{"tags":["string"],"themes":["string"],"campaignLabel":"string|null"}',
      max_tokens: 300,
    })
    return {
      tags: raw.tags?.length ? raw.tags : fallback.tags,
      themes: raw.themes ?? [],
      campaignLabel: raw.campaignLabel ?? null,
    }
  } catch {
    return fallback
  }
}

export async function autoTagAsset(
  supabase: SupabaseClient,
  userId: string,
  assetId: string
): Promise<string[] | null> {
  const { data } = await supabase
    .from('creative_assets')
    .select('id, title, description, type, metadata, tags, source_type, source_id')
    .eq('id', assetId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return null

  const suggestion = await suggestAssetTags({
    title: data.title,
    description: data.description,
    type: data.type,
    metadata: (data.metadata ?? {}) as Record<string, unknown>,
  })

  const merged = [...new Set([...(data.tags ?? []), ...suggestion.tags, ...suggestion.themes])].slice(0, 24)
  await supabase
    .from('creative_assets')
    .update({
      tags: merged,
      metadata: {
        ...(data.metadata as Record<string, unknown>),
        campaignLabel: suggestion.campaignLabel,
        autoTaggedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
    .eq('user_id', userId)

  if (data.source_type === 'project_asset') {
    await supabase
      .from('project_assets')
      .update({ tags: merged, updated_at: new Date().toISOString() })
      .eq('id', data.source_id)
      .eq('user_id', userId)
  }

  return merged
}
