import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { buildAgentContext, type AgentContextRow } from '@/lib/agent/agent-context'

export async function loadCreatorAgentContext() {
  const auth = await requireCompanionUser()
  if (auth.response) return { auth, ctx: null as null }

  const { data } = await auth.supabase
    .from('creator_profiles')
    .select(
      'niche, platform, content_style, creator_goal, creator_dna, memory_graph, learning_events'
    )
    .eq('user_id', auth.user!.id)
    .maybeSingle()

  const ctx = buildAgentContext(auth.user!.id, (data ?? null) as AgentContextRow | null)
  return { auth, ctx }
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}
