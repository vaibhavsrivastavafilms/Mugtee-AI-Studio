'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { MugteeOrb } from '@/components/mugtee/mugtee-orb'
import { buildTodaysBrief } from '@/lib/sidekick/todays-brief'
import { fetchCreatorMemoryProfile } from '@/lib/creator/creator-memory'
import { quickCutStudioHref, STUDIO } from '@/lib/create/routes'

export function TodaysBriefSection() {
  const [firstName, setFirstName] = useState<string | null>(null)
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchCreatorMemoryProfile>>>({})

  useEffect(() => {
    try {
      setFirstName(localStorage.getItem('mugtee:user-firstname:v1'))
    } catch {}
    void fetchCreatorMemoryProfile().then(setProfile)
  }, [])

  const brief = useMemo(
    () => buildTodaysBrief(profile, firstName),
    [profile, firstName]
  )

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gold-500/20 bg-gradient-to-br from-gold-500/[0.06] to-transparent p-5 sm:p-6"
    >
      <div className="flex items-start gap-3 mb-4">
        <MugteeOrb state="idle" size={40} useLogo className="shrink-0" />
        <div>
          <p className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80 mb-1">
            Today&apos;s Brief
          </p>
          <p className="text-sm text-luxe/80 leading-relaxed">{brief.greeting}</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5">
          <dt className="text-[9px] tracking-[0.2em] uppercase text-luxe/45 mb-0.5">Focus</dt>
          <dd className="text-luxe/85">{brief.goalLine}</dd>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5">
          <dt className="text-[9px] tracking-[0.2em] uppercase text-luxe/45 mb-0.5">Niche</dt>
          <dd className="text-luxe/85 capitalize">{brief.nicheLine}</dd>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5 sm:col-span-2">
          <dt className="text-[9px] tracking-[0.2em] uppercase text-luxe/45 mb-0.5">
            Recommended topic
          </dt>
          <dd className="text-luxe/90 font-medium">{brief.recommendedTopic}</dd>
          <p className="text-[11px] text-gold-200/80 italic mt-1.5">&ldquo;{brief.recommendedHook}&rdquo;</p>
          <p className="text-[10px] text-luxe/45 mt-1">{brief.contentType}</p>
        </div>
        <div className="rounded-xl border border-gold-500/15 bg-gold-500/[0.04] px-3 py-2.5 sm:col-span-2">
          <dt className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70 mb-0.5">
            Next milestone
          </dt>
          <dd className="text-luxe/85">{brief.nextMilestone}</dd>
        </div>
      </dl>

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
