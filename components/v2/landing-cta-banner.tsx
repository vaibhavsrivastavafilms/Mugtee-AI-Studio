'use client'

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { LuxButton } from '@/components/v2/lux-button'
import { CreatorExperienceSelector } from '@/components/create/creator-experience-selector'
import {
  DEFAULT_CREATOR_EXPERIENCE,
  loadCreatorExperiencePreference,
  saveCreatorExperiencePreference,
  type CreatorExperienceLevel,
} from '@/lib/cinematic/creator-experience-level'
import { cn } from '@/lib/utils'

export function LandingCtaBanner({ className }: { className?: string }) {
  const [experienceLevel, setExperienceLevel] = useState<CreatorExperienceLevel>(
    DEFAULT_CREATOR_EXPERIENCE
  )

  useEffect(() => {
    setExperienceLevel(loadCreatorExperiencePreference())
  }, [])

  const handleExperienceChange = (level: CreatorExperienceLevel) => {
    setExperienceLevel(level)
    saveCreatorExperiencePreference(level)
  }

  const createHref = `/create?mode=quick&experience=${experienceLevel}`

  return (
    <section className={cn('px-5 sm:px-6 py-16 sm:py-20', className)}>
      <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] px-8 sm:px-14 py-12 sm:py-16 text-center">
        <h2 className="font-display text-3xl sm:text-[2.25rem] leading-tight text-[var(--v2-text-primary)]">
          Create 30 days of content{' '}
          <span className="italic text-[var(--v2-gold)]">in one hour</span>
        </h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-4">
          <CreatorExperienceSelector
            value={experienceLevel}
            onChange={handleExperienceChange}
            variant="landing"
            className="mx-auto"
          />
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <LuxButton href={createHref} size="lg" className="rounded-full">
              Launch Mugtee <ArrowRight className="h-4 w-4" />
            </LuxButton>
            <LuxButton href="/pricing" variant="secondary" size="lg" className="rounded-full">
              View pricing
            </LuxButton>
          </div>
        </div>
        <p className="mt-4 text-[11px] tracking-[0.18em] uppercase text-[var(--v2-text-secondary)]">
          No credit card required
        </p>
      </div>
    </section>
  )
}
