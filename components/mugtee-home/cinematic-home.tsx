'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { HeroSection } from '@/components/mugtee-home/hero-section'

const WorkflowPipeline = dynamic(
  () =>
    import('@/components/mugtee-home/workflow-pipeline').then((m) => ({
      default: m.WorkflowPipeline,
    })),
  { ssr: false }
)
const LiveOutputPreview = dynamic(
  () =>
    import('@/components/mugtee-home/live-output-preview').then((m) => ({
      default: m.LiveOutputPreview,
    })),
  { ssr: false }
)
const ShowcaseGrid = dynamic(
  () =>
    import('@/components/mugtee-home/showcase-grid').then((m) => ({
      default: m.ShowcaseGrid,
    })),
  { ssr: false }
)
const TrustSection = dynamic(
  () =>
    import('@/components/mugtee-home/trust-section').then((m) => ({
      default: m.TrustSection,
    })),
  { ssr: false }
)
const PricingCards = dynamic(
  () =>
    import('@/components/mugtee-home/pricing-cards').then((m) => ({
      default: m.PricingCards,
    })),
  { ssr: false }
)
const FooterCTA = dynamic(
  () =>
    import('@/components/mugtee-home/footer-cta').then((m) => ({
      default: m.FooterCTA,
    })),
  { ssr: false }
)

function CinematicHomeInner() {
  const { ready: authReady, user } = useAuthHydration()
  const signedIn = authReady ? Boolean(user) : null

  const createHref = '/create?mode=quick'
  const dashboardHref = '/dashboard'
  const loginHref = '/login?next=%2Fdashboard'

  return (
    <div className="relative min-h-[100dvh] bg-[#050505] text-luxe overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-noir-radial" />

      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-md">
        <div className="container max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-6 py-3">
          <Link href={createHref} className="flex items-center gap-2 min-h-[44px] transition-opacity hover:opacity-90">
            <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center shadow-gold-glow">
              <span className="font-display text-sm text-black font-black">M</span>
            </div>
            <span className="font-display text-sm tracking-wide text-gold-gradient">Mugtee</span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-5">
            <a
              href="#pipeline"
              className="hidden sm:inline text-[11px] tracking-[0.16em] uppercase text-luxe/50 hover:text-luxe/80 transition"
            >
              Pipeline
            </a>
            <a
              href="#pricing"
              className="hidden sm:inline text-[11px] tracking-[0.16em] uppercase text-luxe/50 hover:text-luxe/80 transition"
            >
              Pricing
            </a>
            {signedIn ? (
              <>
                <Link
                  href={dashboardHref}
                  className="hidden sm:inline-flex text-[11px] tracking-[0.14em] uppercase text-luxe/60 hover:text-luxe/90 transition min-h-[44px] items-center"
                >
                  Dashboard
                </Link>
                <Link
                  href={createHref}
                  className="inline-flex min-h-[44px] items-center justify-center px-4 py-2 rounded-lg bg-gold-gradient text-black text-[11px] tracking-[0.14em] uppercase font-semibold shadow-gold-glow hover:opacity-90 transition-opacity"
                >
                  Create
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={loginHref}
                  className="text-[11px] tracking-[0.14em] uppercase text-gold-300/90 hover:text-gold-200 transition min-h-[44px] flex items-center"
                >
                  Sign in
                </Link>
                <Link
                  href={createHref}
                  className="inline-flex min-h-[44px] items-center justify-center px-4 py-2 rounded-lg bg-gold-gradient text-black text-[11px] tracking-[0.14em] uppercase font-semibold shadow-gold-glow hover:opacity-90 transition-opacity"
                >
                  Create
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <HeroSection dashboardHref={createHref} loginHref={createHref} signedIn={signedIn} />
        <WorkflowPipeline />
        <LiveOutputPreview />
        <ShowcaseGrid />
        <TrustSection />
        <PricingCards />
        <FooterCTA dashboardHref={createHref} loginHref={createHref} signedIn={signedIn} />
      </main>
    </div>
  )
}

export function CinematicHome() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center">
          <div className="w-8 h-8 rounded-lg bg-gold-gradient animate-pulse" />
        </div>
      }
    >
      <CinematicHomeInner />
    </Suspense>
  )
}
