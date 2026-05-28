'use client'

import { CinematicDashboardHero } from '@/components/dashboard/cinematic-dashboard-hero'
import { CinematicQuickActions } from '@/components/dashboard/cinematic-quick-actions'
import { RecentProjectsGrid } from '@/components/dashboard/recent-projects-grid'
import { CreatorShowcase } from '@/components/dashboard/creator-showcase'
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay'

export default function DashboardPage() {
  return (
    <div className="space-y-10 sm:space-y-12 max-w-[1400px] mx-auto pb-10">
      <CinematicDashboardHero />
      <CinematicQuickActions />

      <section className="space-y-4">
        <RecentProjectsGrid />
      </section>

      <CreatorShowcase />

      <OnboardingOverlay />
    </div>
  )
}
