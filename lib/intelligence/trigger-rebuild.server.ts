import { rebuildCreatorIntelligenceGraph } from '@/lib/intelligence/creator-graph.server'

/**
 * Fire-and-forget intelligence graph rebuild after memory learn or producer save.
 * Director Mode only — no-op failures are logged, never thrown to callers.
 */
export async function triggerCreatorIntelligenceRebuild(
  userId: string,
  opts?: { event?: 'memory_learned' | 'producer_report' | 'manual_rebuild'; projectId?: string }
): Promise<void> {
  if (!userId?.trim()) return
  try {
    await rebuildCreatorIntelligenceGraph(userId, {
      event: opts?.event,
      projectId: opts?.projectId,
    })
  } catch (err) {
    console.error('[creator-intelligence] rebuild failed', err)
  }
}
