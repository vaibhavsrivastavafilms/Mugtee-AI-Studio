'use client'
// MUGTEE UNIFIED CREATOR HOME — Master Execution layout.
//
// One workflow, one entry point. The centered cinematic ChatGPT-style studio
// (<ViralQuickStart />) IS the hero. Below it is the continuity layer:
//   • Continue Creating chips    — pick up where you left off
//   • Recent Projects grid       — full project history
//   • Active Pipeline (kanban)   — production state
//   • Stats, calendar, team      — deeper signal
//
// The old split-hero greeting + secondary widgets have been REMOVED — the studio
// now owns the greeting copy itself ("What are we creating today?").

import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { StatCards } from '@/components/dashboard/stat-cards'
import { ProductionTracker } from '@/components/dashboard/production-tracker'
import { TeamActivity } from '@/components/dashboard/team-activity'
import { PostingCalendar } from '@/components/dashboard/posting-calendar'
import { UpcomingShoots } from '@/components/dashboard/upcoming-shoots'
import { ViralQuickStart } from '@/components/dashboard/viral-quick-start'
import { ContinueCreating } from '@/components/dashboard/continue-creating'
import { CreatorTrustLayer } from '@/components/dashboard/creator-trust-layer'
import { RecentProjectsGrid } from '@/components/dashboard/recent-projects-grid'
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay'
import { UsageGauge } from '@/lib/usage'
import { AdSlot } from '@/components/ads/ad-slot'

export default function DashboardPage() {
  const { content } = useStore()
  const piecesInMotion = content.length

  return (
    <div className="space-y-10 sm:space-y-14 max-w-[1400px] mx-auto pb-10">
      {/* ─── 1. UNIFIED CINEMATIC STUDIO — centered, ChatGPT-style ─── */}
      <section className="pt-2 sm:pt-6">
        <ViralQuickStart />
        {piecesInMotion > 0 && (
          <p className="mt-4 text-center text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            <span className="text-gold-300">{piecesInMotion}</span> {piecesInMotion === 1 ? 'piece' : 'pieces'} in motion
          </p>
        )}
      </section>

      {/* ─── 2. Live usage gauge (trial / credits / sponsor) ─── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <UsageGauge />
      </motion.div>

      {/* ─── 3. CONTINUITY LAYER — Continue + Recents ─── */}
      <section className="space-y-6">
        <CreatorTrustLayer />
        <ContinueCreating />
        <RecentProjectsGrid />
      </section>

      {/* ─── 4. Active Pipeline ─── */}
      <section>
        <ProductionTracker />
      </section>

      {/* ─── 5. Production metrics + team + calendar ─── */}
      <StatCards />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <PostingCalendar />
        </div>
        <div className="space-y-5">
          <TeamActivity />
          <UpcomingShoots />
        </div>
      </div>

      {/* Free-tier sponsor slot (auto-hides for paid plans) */}
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD || ''} format="auto" />

      {/* First-login onboarding overlay (one-time, localStorage-gated) */}
      <OnboardingOverlay />
    </div>
  )
}
