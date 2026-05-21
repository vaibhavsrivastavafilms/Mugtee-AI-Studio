'use client'
// MUGTEE V3.1 — Unified Creator Home.
//
// Layout flow:
//   1. Hero block — split layout (lg+): LEFT = greeting + hook copy + recent projects grid,
//      RIGHT = the existing ViralQuickStart studio panel (integrated natively, not floating).
//      Mobile: stacks vertically — Studio panel under the hero text.
//   2. Continue Creating — last script / idea / prompts chip row (hides if empty).
//   3. Active Pipeline — kanban kept but visually relaxed (now ONE column below the hero).
//   4. Stat cards + team activity + posting calendar — kept but pushed deeper.
//
// EXTREME LOW CREDIT MODE: pure CSS grid restructure + 1 new card grid. Studio panel reused as-is.

import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { StatCards } from '@/components/dashboard/stat-cards'
import { ProductionTracker } from '@/components/dashboard/production-tracker'
import { TeamActivity } from '@/components/dashboard/team-activity'
import { PostingCalendar } from '@/components/dashboard/posting-calendar'
import { UpcomingShoots } from '@/components/dashboard/upcoming-shoots'
import { ViralQuickStart } from '@/components/dashboard/viral-quick-start'
import { ContinueCreating } from '@/components/dashboard/continue-creating'
import { RecentProjectsGrid } from '@/components/dashboard/recent-projects-grid'
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay'
import { UsageGauge } from '@/lib/usage'
import { AdSlot } from '@/components/ads/ad-slot'
import { format } from 'date-fns'
import { Sparkles } from 'lucide-react'

export default function DashboardPage() {
  const { content } = useStore()
  const today = new Date()
  const piecesInMotion = content.length

  return (
    <div className="space-y-8 sm:space-y-10 max-w-[1600px] mx-auto">
      {/* ─── 1. Unified cinematic hero — split layout ──────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(420px,520px)] xl:grid-cols-[1fr_minmax(460px,560px)] gap-5 lg:gap-7 items-start">
        {/* LEFT — Greeting + hook + recents */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-5 sm:space-y-6"
        >
          <div>
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-400/80 mb-3 inline-flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              <span>{format(today, 'EEEE · MMM d, yyyy')}</span>
            </div>
            <h1 className="font-display leading-[1.05] text-[2.1rem] sm:text-[2.6rem] lg:text-[3.1rem]">
              <span className="block text-foreground">What are we</span>
              <span className="block text-gold-gradient">creating today?</span>
            </h1>
            <p className="text-luxe/70 mt-3 text-[14px] sm:text-[15px] max-w-md leading-relaxed">
              Turn one idea into a full viral production pipeline — script, storyboard, images, voiceover, export — all in one cinematic workspace.
            </p>
            {piecesInMotion > 0 && (
              <p className="mt-2 text-[11px] tracking-wider text-muted-foreground">
                <span className="text-gold-300">{piecesInMotion}</span> {piecesInMotion === 1 ? 'piece' : 'pieces'} in motion.
              </p>
            )}
          </div>

          {/* Continue Creating chips (hides itself when empty) */}
          <ContinueCreating />

          {/* Recent Projects grid — empty state pre-populates with starter CTAs */}
          <RecentProjectsGrid />
        </motion.div>

        {/* RIGHT — Studio panel, native to hero */}
        <motion.aside
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="lg:sticky lg:top-6"
        >
          <ViralQuickStart />
        </motion.aside>
      </section>

      {/* ─── 2. Live usage gauge (free tier credits / trial / sponsor reward CTA) ─── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <UsageGauge />
      </motion.div>

      {/* ─── 3. Active Pipeline — relaxed visual weight, single column ─── */}
      <section>
        <ProductionTracker />
      </section>

      {/* ─── 4. Production metrics + team + calendar ─── */}
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

      {/* Phase 16 — Free-tier sponsor slot. Auto-hides for Creator/Agency plans. */}
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD || ''} format="auto" />

      {/* First-login onboarding overlay (one-time, localStorage-gated) */}
      <OnboardingOverlay />
    </div>
  )
}
