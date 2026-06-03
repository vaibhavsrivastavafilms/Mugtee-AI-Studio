import type { SupabaseClient } from '@supabase/supabase-js'
import { indexContentHistory } from '@/lib/memory/memory-indexer'
import { detectAndPersistPatterns, ensureDefaultBrand } from '@/lib/memory/pattern-detection'
import { getBrandBySlug } from '@/lib/memory/memory-manager'
import { processLearningEvent } from '@/lib/memory/learning-loop'
import type { CreatorEventType } from '@/lib/memory/types'
import {
  linkBrandToCampaign,
  linkCampaignToContent,
  linkCreatorToBrand,
} from '@/lib/memory/knowledge-graph'
import { profileToDbPatch, rowToMemoryProfile } from '@/lib/memory/creator-memory-engine'

export type WorkflowCompletePayload = {
  projectId?: string
  title?: string
  hook?: string
  theme?: string
  tone?: string
  platform?: string
  format?: string
  contentType?: string
  campaign?: string
  brandSlug?: string
  brandDisplayName?: string
  hookRegens?: number
  scriptRegens?: number
  scriptExcerpt?: string
  eventType?: CreatorEventType
}

/** After workflow complete: patterns, feedback, content history, graph */
export async function learnFromWorkflowComplete(
  supabase: SupabaseClient,
  userId: string,
  payload: WorkflowCompletePayload
): Promise<{ ok: boolean }> {
  let brandId: string | null = null
  if (payload.brandSlug) {
    brandId = await ensureDefaultBrand(
      supabase,
      userId,
      payload.brandSlug,
      payload.brandDisplayName ?? payload.brandSlug
    )
    if (!brandId) {
      const brand = await getBrandBySlug(supabase, userId, payload.brandSlug)
      brandId = brand?.id ?? null
    }
  }

  const eventType = payload.eventType ?? 'export_success'
  const { profile } = await processLearningEvent(supabase, userId, eventType, {
    projectId: payload.projectId,
    title: payload.title,
    hook: payload.hook,
    theme: payload.theme,
    tone: payload.tone,
  })

  await detectAndPersistPatterns(
    supabase,
    userId,
    {
      hookRegens: payload.hookRegens,
      scriptRegens: payload.scriptRegens,
      hook: payload.hook,
      theme: payload.theme,
      format: payload.format,
      platform: payload.platform,
      contentType: payload.contentType,
      campaign: payload.campaign,
      brandSlug: payload.brandSlug,
    },
    brandId
  )

  await indexContentHistory(supabase, userId, {
    projectId: payload.projectId,
    brandId,
    contentType: payload.contentType ?? 'reel',
    title: payload.title,
    hook: payload.hook,
    theme: payload.theme,
    platform: payload.platform,
    format: payload.format,
    scriptExcerpt: payload.scriptExcerpt,
    campaign: payload.campaign,
  })

  let graph = profile.memoryGraph
  if (payload.brandSlug) {
    graph = linkCreatorToBrand(graph, userId.slice(0, 8), payload.brandSlug)
    if (payload.campaign) {
      graph = linkBrandToCampaign(graph, payload.brandSlug, payload.campaign)
      if (payload.projectId) {
        graph = linkCampaignToContent(graph, payload.campaign, payload.projectId)
      }
    }
  }

  const updated = { ...profile, memoryGraph: graph }
  await supabase
    .from('creator_profiles')
    .update(profileToDbPatch(updated))
    .eq('user_id', userId)

  return { ok: true }
}

/** Client fire-and-forget after export / workflow */
export function logWorkflowCompleteClient(payload: WorkflowCompletePayload): void {
  if (typeof window === 'undefined') return
  void fetch('/api/memory/learn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
}
