'use client'

import { useEffect } from 'react'
import { CeoBriefingModal } from '@/components/agent/ceo-briefing-modal'
import { CompetitorInsightsPanel } from '@/components/agent/competitor-insights-panel'
import { CreatorMissionBoard } from '@/components/agent/creator-mission-board'
import { IdeaCaptureInput } from '@/components/agent/idea-capture-input'
import { OpportunityFeed } from '@/components/agent/opportunity-feed'
import { WeeklyPlannerCard } from '@/components/agent/weekly-planner-card'
import { RecommendedNextMoveCard } from '@/components/decision/recommended-next-move-card'
import { useCreatorAgentStore } from '@/stores/creator-agent-store'

export function GrowthCommandCenter() {
  const fetchBriefing = useCreatorAgentStore((s) => s.fetchBriefing)
  const setBriefingOpen = useCreatorAgentStore((s) => s.setBriefingOpen)

  useEffect(() => {
    void fetchBriefing()
  }, [fetchBriefing])

  return (
    <div className="max-w-[1200px] mx-auto w-full space-y-8 sm:space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.32em] uppercase text-[var(--v2-gold)] mb-1">
            Growth Command Center
          </p>
          <h1 className="font-display text-2xl sm:text-3xl text-[var(--v2-text-primary)]">
            What, why & how to create
          </h1>
          <p className="text-xs text-luxe/50 mt-1 italic">
            Proactive agent — opportunities, weekly plan, and expected performance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBriefingOpen(true)}
          className="self-start sm:self-auto px-4 py-2 rounded-xl border border-gold-500/30 bg-gold-500/10 text-[10px] tracking-[0.18em] uppercase text-gold-200 hover:bg-gold-500/15"
        >
          CEO briefing
        </button>
      </header>

      <RecommendedNextMoveCard />

      <IdeaCaptureInput />

      <OpportunityFeed />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyPlannerCard />
        <CreatorMissionBoard />
      </div>

      <CompetitorInsightsPanel />

      <CeoBriefingModal />
    </div>
  )
}
