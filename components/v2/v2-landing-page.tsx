'use client'

import { LuxNav } from '@/components/v2/lux-nav'
import { LuxFooter } from '@/components/v2/lux-footer'
import { CinematicParticles } from '@/components/v2/cinematic-particles'
import { LandingHeroSplit } from '@/components/v2/landing-hero-split'
import { LandingTrustedBy } from '@/components/v2/landing-trusted-by'
import { LandingWorkflowTimeline } from '@/components/v2/landing-workflow-timeline'
import { PosterGrid } from '@/components/v2/poster-grid'
import { LandingCtaBanner } from '@/components/v2/landing-cta-banner'

export default function V2LandingPage() {
  return (
    <div className="relative min-h-[100dvh] bg-[var(--v2-bg)] text-[var(--v2-text-primary)] overflow-x-hidden v2-page-enter">
      <CinematicParticles />
      <LuxNav />

      <main className="relative z-10">
        <LandingHeroSplit />
        <LandingTrustedBy />
        <LandingWorkflowTimeline />
        <PosterGrid />
        <LandingCtaBanner />
      </main>

      <LuxFooter />
    </div>
  )
}
