'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ShowcaseProject } from '@/lib/showcase/public-projects'
import { MadeWithMugteeCard } from '@/components/showcase/made-with-mugtee-card'
import { MadeWithMugteeStaticGrid } from '@/components/v2/made-with-mugtee-static'
import { LuxNav } from '@/components/v2/lux-nav'
import { LuxFooter } from '@/components/v2/lux-footer'
import { CinematicParticles } from '@/components/v2/cinematic-particles'

export function MadeWithMugteeHub({ limit = 48 }: { limit?: number }) {
  const [projects, setProjects] = useState<ShowcaseProject[] | null>(null)

  useEffect(() => {
    let alive = true
    void fetch(`/api/showcase/projects?limit=${limit}`)
      .then((res) => res.json())
      .then((body: { projects?: ShowcaseProject[] }) => {
        if (!alive) return
        setProjects(Array.isArray(body.projects) ? body.projects : [])
      })
      .catch(() => {
        if (alive) setProjects([])
      })
    return () => {
      alive = false
    }
  }, [limit])

  const showDynamic = projects !== null && projects.length > 0
  const showStatic = projects !== null && projects.length === 0

  return (
    <div className="relative min-h-[100dvh] bg-[var(--v2-bg)] text-[var(--v2-text-primary)] overflow-x-hidden v2-page-enter">
      <CinematicParticles />
      <LuxNav />

      <main className="relative z-10 px-5 sm:px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--v2-text-secondary)] hover:text-[var(--v2-text-primary)] transition mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>

          <div className="text-center mb-14">
            <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--v2-gold)] mb-3">
              Gallery
            </p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-[var(--v2-text-primary)]">
              Made With Mugtee
            </h1>
            <p className="mt-4 text-base sm:text-lg text-[var(--v2-text-secondary)] max-w-xl mx-auto">
              Real creator outputs — prompts, hooks, and previews from the Mugtee studio.
            </p>
          </div>

          {projects === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] animate-pulse"
                />
              ))}
            </div>
          ) : null}

          {showDynamic ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <MadeWithMugteeCard key={project.id} project={project} />
              ))}
            </div>
          ) : null}

          {showStatic ? (
            <>
              <p className="text-center text-sm text-[var(--v2-text-secondary)] mb-8">
                No public showcases yet — here&apos;s what creators build with Mugtee.
              </p>
              <MadeWithMugteeStaticGrid />
            </>
          ) : null}
        </div>
      </main>

      <LuxFooter />
    </div>
  )
}
