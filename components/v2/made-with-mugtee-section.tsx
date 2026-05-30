'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShowcaseProject } from '@/lib/showcase/public-projects'
import { MadeWithMugteeCard } from '@/components/showcase/made-with-mugtee-card'
import { MadeWithMugteeStaticGrid } from '@/components/v2/made-with-mugtee-static'

export function MadeWithMugteeSection({ className }: { className?: string }) {
  const [projects, setProjects] = useState<ShowcaseProject[] | null>(null)

  useEffect(() => {
    let alive = true
    void fetch('/api/showcase/projects?limit=12')
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
  }, [])

  const showDynamic = projects !== null && projects.length > 0
  const showStatic = projects !== null && projects.length === 0

  return (
    <section className={cn('px-5 sm:px-6 py-20 sm:py-28', className)}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--v2-gold)] mb-3">
            Gallery
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-[var(--v2-text-primary)]">
            Made With Mugtee
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[var(--v2-text-secondary)] max-w-xl mx-auto">
            See what creators are building.
          </p>
        </div>

        {projects === null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] animate-pulse"
              />
            ))}
          </div>
        ) : null}

        {showDynamic ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((project) => (
              <MadeWithMugteeCard key={project.id} project={project} />
            ))}
          </div>
        ) : null}

        {showStatic ? <MadeWithMugteeStaticGrid /> : null}

        <div className="mt-10 text-center">
          <Link
            href="/made-with-mugtee"
            className="inline-flex items-center gap-2 text-sm tracking-[0.12em] uppercase text-[var(--v2-gold)] hover:text-[var(--v2-text-primary)] transition"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
