'use client'

import { ContinueProjectCard } from '@/components/trust/continue-project-card'
import { ProjectRecoveryBanner } from '@/components/trust/project-recovery-banner'
import { DashboardStartNewSection } from '@/components/dashboard/dashboard-start-new-section'
import { CreatorShowcase } from '@/components/dashboard/creator-showcase'
import { CinematicDashboardHero } from '@/components/dashboard/cinematic-dashboard-hero'
import { CinematicQuickActions } from '@/components/dashboard/cinematic-quick-actions'
import { RecentProjectsGrid } from '@/components/dashboard/recent-projects-grid'
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay'

export default function DashboardPage() {
  return (
    <div className="space-y-10 sm:space-y-12 max-w-[1400px] mx-auto pb-10">
      <ContinueProjectCard />
      <DashboardStartNewSection />
      <CreatorShowcase />
      <ProjectRecoveryBanner className="max-w-2xl" />

      <CinematicDashboardHero />
      <CinematicQuickActions />

      <section className="space-y-4">
        <RecentProjectsGrid />
      </section>

      <OnboardingOverlay />
    </div>
  )
}
