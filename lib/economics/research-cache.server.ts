import 'server-only'

import { createHash } from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { DeepResearchReport } from '@/types/deep-research'
import { normalizeDeepResearchReport, serializeDeepResearchReport } from '@/lib/ai/prompts/youtube/deep-research-sop'

export function hashResearchTopic(topic: string): string {
  return createHash('sha256').update(topic.trim().toLowerCase()).digest('hex')
}

export type CachedResearchRow = {
  id: string
  project_id: string | null
  user_id: string
  research_text: string
  topic_hash: string
  report_json: DeepResearchReport | null
  created_at: string
}

export async function loadCachedResearch(input: {
  userId: string
  projectId?: string | null
  topic: string
}): Promise<CachedResearchRow | null> {
  const supabase = createSupabaseServerClient()
  const topicHash = hashResearchTopic(input.topic)

  if (input.projectId) {
    const { data } = await supabase
      .from('project_research_cache')
      .select('*')
      .eq('project_id', input.projectId)
      .eq('user_id', input.userId)
      .eq('topic_hash', topicHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) return mapRow(data)
  }

  const { data: byTopic } = await supabase
    .from('project_research_cache')
    .select('*')
    .eq('user_id', input.userId)
    .eq('topic_hash', topicHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return byTopic ? mapRow(byTopic) : null
}

export async function storeResearchCache(input: {
  userId: string
  projectId?: string | null
  topic: string
  document: string
  report: DeepResearchReport
}): Promise<void> {
  const supabase = createSupabaseServerClient()
  const topicHash = hashResearchTopic(input.topic)
  const researchText = input.document.trim() || serializeDeepResearchReport(input.report)

  await supabase.from('project_research_cache').upsert(
    {
      user_id: input.userId,
      project_id: input.projectId ?? null,
      topic_hash: topicHash,
      research_text: researchText.slice(0, 120_000),
      report_json: input.report,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,topic_hash' }
  )
}

function mapRow(raw: Record<string, unknown>): CachedResearchRow {
  const reportRaw = raw.report_json
  let report: DeepResearchReport | null = null
  if (reportRaw && typeof reportRaw === 'object' && !Array.isArray(reportRaw)) {
    report = normalizeDeepResearchReport(reportRaw, '')
  }
  return {
    id: String(raw.id),
    project_id: typeof raw.project_id === 'string' ? raw.project_id : null,
    user_id: String(raw.user_id),
    research_text: String(raw.research_text ?? ''),
    topic_hash: String(raw.topic_hash ?? ''),
    report_json: report,
    created_at: String(raw.created_at ?? ''),
  }
}
