'use client'

import { CinematicHomeHeader } from '@/components/home/CinematicHomeHeader'
import { CinematicHero } from '@/components/home/CinematicHero'
import { QuickCutCard } from '@/components/home/QuickCutCard'
import { DirectorModeCard } from '@/components/home/DirectorModeCard'
import { WorkflowPipeline } from '@/components/home/WorkflowPipeline'
import { TrustBar } from '@/components/home/TrustBar'

/** Single-screen 100vh cinematic homepage — Quick Cut + Director previews. */
export default function CinematicHomePage() {
  return (
    <div
      data-cinematic-home
      className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#050505] text-white"
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-30"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.08), transparent 55%), radial-gradient(ellipse 40% 30% at 10% 80%, rgba(212,175,55,0.05), transparent), radial-gradient(ellipse 40% 30% at 90% 70%, rgba(212,175,55,0.04), transparent)',
        }}
      />

      <CinematicHomeHeader />

      <div className="flex min-h-0 flex-1 flex-col">
        <CinematicHero />

        <main
          id="showcase"
          className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_auto_1fr] gap-2 overflow-hidden px-3 pb-1 sm:gap-2.5 sm:px-4 md:grid-cols-2 md:grid-rows-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:grid-rows-1 lg:gap-3 lg:px-6"
        >
          <QuickCutCard className="min-h-0 overflow-hidden md:col-start-1 md:row-start-1" />
          <WorkflowPipeline
            className="hidden min-h-0 lg:flex lg:col-start-2 lg:row-start-1 lg:w-[88px] xl:w-[96px]"
            orientation="vertical"
          />
          <WorkflowPipeline
            className="min-h-0 md:col-span-2 lg:hidden"
            orientation="horizontal"
          />
          <DirectorModeCard className="min-h-0 overflow-hidden md:col-start-2 md:row-start-1 lg:col-start-3" />
        </main>

        <TrustBar />
      </div>
    </div>
  )
}
