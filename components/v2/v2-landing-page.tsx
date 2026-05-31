'use client'

import nextDynamic from 'next/dynamic'
import { LuxNav } from '@/components/v2/lux-nav'
import { LuxFooter } from '@/components/v2/lux-footer'
import { CinematicParticles } from '@/components/v2/cinematic-particles'
import { LandingHeroSplit } from '@/components/v2/landing-hero-split'
import { ProductDemoFlow } from '@/components/marketing/product-demo-flow'
import { CreatorAudienceSection } from '@/components/marketing/creator-audience-section'
import { WhatYouGetSection } from '@/components/marketing/what-you-get-section'
import { HowItWorksSection } from '@/components/marketing/how-it-works-section'
import { FinalCtaSection } from '@/components/marketing/final-cta-section'
import { TrustMetricsStrip } from '@/components/proof/trust-metrics-strip'
import { HomepageJsonLd } from '@/components/seo/homepage-json-ld'

const ShowcaseSection = nextDynamic(
  () => import('@/components/proof/showcase-section').then((m) => ({ default: m.ShowcaseSection })),
  { loading: () => <section className="min-h-[240px]" aria-hidden /> }
)

export default function V2LandingPage() {
  return (
    <div className="relative min-h-[100dvh] bg-[var(--v2-bg)] text-[var(--v2-text-primary)] overflow-x-hidden v2-page-enter">
      <HomepageJsonLd />
      <CinematicParticles />
      <LuxNav variant="marketing" />

      <main className="relative z-10">
        <LandingHeroSplit />
        <ProductDemoFlow />
        <CreatorAudienceSection />
        <WhatYouGetSection />
        <ShowcaseSection />
        <TrustMetricsStrip variant="homepage" />
        <HowItWorksSection />
        <FinalCtaSection />
      </main>

      <LuxFooter />
    </div>
  )
}
