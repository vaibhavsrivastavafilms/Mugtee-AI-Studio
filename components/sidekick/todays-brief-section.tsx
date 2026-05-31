'use client'



import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import { motion } from 'framer-motion'

import { ArrowRight, Sparkles } from 'lucide-react'

import { MugteeSidekickAvatar } from '@/components/sidekick/mugtee-sidekick-avatar'
import { CreatorLevelBadge } from '@/components/mission/creator-level-badge'

import { buildTodaysBrief } from '@/lib/sidekick/todays-brief'

import { computeGoalProgress } from '@/lib/sidekick/creator-journey'

import { fetchCreatorMemoryProfile } from '@/lib/creator/creator-memory'
import { useCreatorMemoryStore } from '@/stores/creator-memory-store'
import { RelationshipBadge } from '@/components/memory/relationship-badge'

import { quickCutStudioHref, STUDIO } from '@/lib/create/routes'

import { cn } from '@/lib/utils'



export function TodaysBriefSection() {

  const [firstName, setFirstName] = useState<string | null>(null)

  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchCreatorMemoryProfile>>>({})

  const [projectsCount, setProjectsCount] = useState(0)

  const memoryProfile = useCreatorMemoryStore((s) => s.profile)
  const hydrateMemory = useCreatorMemoryStore((s) => s.hydrate)
  const companionMessage = useCreatorMemoryStore((s) => s.companionMessage)
  const refreshCompanionMessage = useCreatorMemoryStore((s) => s.refreshCompanionMessage)

  useEffect(() => {

    try {

      setFirstName(localStorage.getItem('mugtee:user-firstname:v1'))

    } catch {}

    void fetchCreatorMemoryProfile().then(setProfile)

    void hydrateMemory()
    void refreshCompanionMessage()

    void fetch('/api/usage', { cache: 'no-store' })

      .then((r) => (r.ok ? r.json() : null))

      .then((data) => {

        if (data?.used?.projects != null) setProjectsCount(Number(data.used.projects) || 0)

      })

      .catch(() => {})

  }, [])



  const brief = useMemo(

    () => buildTodaysBrief(profile, firstName),

    [profile, firstName]

  )



  const goalProgress = useMemo(

    () => computeGoalProgress(profile.creatorGoal, projectsCount),

    [profile.creatorGoal, projectsCount]

  )



  return (

    <motion.section

      initial={{ opacity: 0, y: 10 }}

      animate={{ opacity: 1, y: 0 }}

      className="rounded-2xl border border-gold-500/20 bg-gradient-to-br from-gold-500/[0.06] to-transparent p-5 sm:p-6"

    >

      <div className="flex items-start gap-3 mb-4">

        <MugteeSidekickAvatar size="md" className="shrink-0" />

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2 mb-1">

            <p className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80">

              Today&apos;s Brief

            </p>

            <RelationshipBadge
              level={memoryProfile.relationshipLevel}
              score={memoryProfile.relationshipScore}
            />

          </div>

          <CreatorLevelBadge className="mb-1.5" />

          <p className="text-sm text-luxe/80 leading-relaxed">{brief.greeting}</p>

          {companionMessage?.insight ? (

            <p className="text-xs text-luxe/55 mt-1.5 italic">{companionMessage.insight}</p>

          ) : null}

        </div>

      </div>



      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">

        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5">

          <p className="text-[9px] tracking-[0.2em] uppercase text-luxe/45 mb-0.5">Focus</p>

          <p className="text-luxe/85">{brief.goalLine}</p>

        </div>

        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5">

          <p className="text-[9px] tracking-[0.2em] uppercase text-luxe/45 mb-0.5">Niche</p>

          <p className="text-luxe/85 capitalize">{brief.nicheLine}</p>

        </div>

        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5">

          <p className="text-[9px] tracking-[0.2em] uppercase text-luxe/45 mb-0.5">Experience</p>

          <p className="text-luxe/85">{brief.experienceLine}</p>

        </div>

        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5">

          <p className="text-[9px] tracking-[0.2em] uppercase text-luxe/45 mb-0.5">Platform</p>

          <p className="text-luxe/85">{brief.platformLine}</p>

        </div>

        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5 sm:col-span-2">

          <p className="text-[9px] tracking-[0.2em] uppercase text-luxe/45 mb-0.5">

            Recommended topic

          </p>

          <p className="text-luxe/90 font-medium">{brief.recommendedTopic}</p>

          <p className="text-[11px] text-gold-200/80 italic mt-1.5">&ldquo;{brief.recommendedHook}&rdquo;</p>

          <p className="text-[10px] text-luxe/45 mt-1">{brief.contentType}</p>

          <p className="text-[10px] text-luxe/50 mt-1.5">{brief.reason}</p>

        </div>

        <div className="rounded-xl border border-gold-500/15 bg-gold-500/[0.04] px-3 py-2.5 sm:col-span-2">

          <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70 mb-0.5">

            Next milestone

          </p>

          <p className="text-luxe/85">{brief.nextMilestone}</p>

        </div>

      </div>



      <div className="mb-4 space-y-1.5">

        <div className="flex items-center justify-between gap-2 text-[10px] tracking-[0.16em] uppercase">

          <span className="text-luxe/45">{goalProgress.label}</span>

          <span className="text-gold-300/70">{goalProgress.percent}%</span>

        </div>

        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">

          <div

            className={cn(

              'h-full rounded-full bg-gold-gradient transition-all duration-700',

              goalProgress.percent >= 100 && 'shadow-[0_0_12px_rgba(212,175,55,0.5)]'

            )}

            style={{ width: `${goalProgress.percent}%` }}

          />

        </div>

      </div>



      <div className="flex flex-wrap gap-2">

        <Link

          href={quickCutStudioHref({ topic: brief.recommendedTopic.slice(0, 120) })}

          className="inline-flex items-center gap-1.5 rounded-xl bg-gold-gradient px-4 py-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-black shadow-gold-glow hover:opacity-90 transition"

        >

          <Sparkles className="w-3.5 h-3.5" />

          Ask Mugtee

        </Link>

        <Link

          href={STUDIO.settings}

          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-4 py-2 text-[11px] tracking-[0.12em] uppercase text-luxe/60 hover:text-gold-200 transition"

        >

          Edit profile

          <ArrowRight className="w-3 h-3" />

        </Link>

      </div>

    </motion.section>

  )

}

