'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { StudioProjectLibrary } from '@/components/projects/studio-project-library'
import { ProjectLibraryCardSkeleton } from '@/components/projects/project-library-card'

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <ProjectLibraryCardSkeleton key={index} />
      ))}
    </div>
  )
}

export default function StudioProjectsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-3xl border border-[#D4AF37]/15 bg-gradient-to-b from-[#D4AF37]/[0.06] to-transparent p-6 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4AF37]/80">Project library</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
          Project Library
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
          Your creations, all in one place.
        </p>
        <Link
          href="/studio"
          className="mt-5 inline-flex min-h-[44px] items-center rounded-xl border border-white/10 px-4 text-sm text-white/75 hover:bg-white/[0.04]"
        >
          ← Back to Studio
        </Link>
      </header>

      <Suspense fallback={<LibrarySkeleton />}>
        <StudioProjectLibrary />
      </Suspense>
    </div>
  )
}
