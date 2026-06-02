'use client'

import { useCallback, useEffect } from 'react'
import { useCompanionStore } from '@/stores/companion-store'
import { fetchCreatorMemoryProfile, type CreatorMemoryProfile } from '@/lib/creator/creator-memory'
import { buildTodaysBrief } from '@/lib/sidekick/todays-brief'

/** Wire Live Companion to existing creator memory + opportunity brief. */
export function useCompanionMemoryContext() {
  const creatorMemory = useCompanionStore((s) => s.creatorMemory)
  const loadCreatorMemory = useCompanionStore((s) => s.loadCreatorMemory)

  useEffect(() => {
    void loadCreatorMemory()
  }, [loadCreatorMemory])

  const loadProfile = useCallback(async (): Promise<CreatorMemoryProfile | null> => {
    try {
      return await fetchCreatorMemoryProfile()
    } catch {
      return null
    }
  }, [])

  const buildOpportunityHint = useCallback(async (): Promise<string | null> => {
    const profile = await loadProfile()
    if (!profile) return null
    const brief = buildTodaysBrief(profile, null)
    return `${brief.recommendedTopic} — "${brief.recommendedHook}"`
  }, [loadProfile])

  return {
    creatorMemory,
    loadProfile,
    buildOpportunityHint,
    reloadMemory: loadCreatorMemory,
  }
}
