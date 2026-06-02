'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ExternalLink, Gift, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { SPONSOR_LIST, getSponsor } from '@/lib/sponsors'
import { useUsage } from '@/lib/usage'
import { cn } from '@/lib/utils'

type SponsorStats = {
  total: number
  rewards: number
  credits: number
  top: { sponsor: string; count: number } | null
}

async function fetchSponsorStats(): Promise<SponsorStats> {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    return { total: 0, rewards: 0, credits: 0, top: null }
  }

  const { data, error } = await supabase
    .from('sponsor_clicks')
    .select('sponsor, rewarded, credits_given')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.warn('[Sponsor Analytics] error', error)
    return { total: 0, rewards: 0, credits: 0, top: null }
  }

  const rows = data || []
  const tally: Record<string, number> = {}
  let rewards = 0
  let credits = 0

  for (const r of rows) {
    const s = String(r.sponsor || 'unknown')
    tally[s] = (tally[s] || 0) + 1
    if (r.rewarded) rewards += 1
    credits += Number(r.credits_given || 0)
  }

  const topEntry = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
  const top = topEntry ? { sponsor: topEntry[0], count: topEntry[1] } : null

  return { total: rows.length, rewards, credits, top }
}

function sponsorLabel(slug: string): string {
  return getSponsor(slug)?.name ?? slug.replace(/_/g, ' ')
}

/** Curated sponsor offers + affiliate activity dashboard (Settings). */
export function SponsorRewardsSection() {
  const { addBonus, plan, isUnlimited } = useUsage()
  const [stats, setStats] = useState<SponsorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [busySlug, setBusySlug] = useState<string | null>(null)

  const refreshStats = useCallback(async () => {
    setLoading(true)
    try {
      setStats(await fetchSponsorStats())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshStats()
    const onFocus = () => { void refreshStats() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshStats])

  const visitOffer = async (slug: string, reward: number, name: string) => {
    if (busySlug) return
    setBusySlug(slug)
    try {
      const res = await fetch(`/api/sponsor/${slug}?check=1`, { method: 'GET', cache: 'no-store' })
      const d = await res.json().catch(() => ({}))
      const eligible = !!d?.eligible
      const already = !!d?.already_claimed_today

      window.open(`/api/sponsor/${slug}`, '_blank', 'noopener,noreferrer')

      if (eligible && plan === 'free' && !isUnlimited) {
        addBonus(reward)
        toast.success(`+${reward} credits earned from ${name}`)
      } else if (already) {
        toast.message(`Already claimed ${name} today — link opened anyway`)
      } else if (!d?.authenticated) {
        toast.message(`Sign in to earn credits from ${name}`)
      } else {
        toast.message(`Opening ${name}`)
      }

      setTimeout(() => { void refreshStats() }, 800)
    } catch (e) {
      console.warn('[Sponsor Click] failed', (e as Error)?.message || e)
      toast.error('Could not open sponsor offer')
    } finally {
      setBusySlug(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-strong rounded-2xl p-6 sm:p-7 mt-6"
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-gold-300" />
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80">Sponsor rewards</div>
      </div>
      <h2 className="font-display text-xl sm:text-2xl mb-1">
        Your <span className="text-gold-gradient">affiliate activity</span>
      </h2>
      <p className="text-[12px] text-luxe/65 mb-5">
        Clicks on Mugtee-curated sponsor offers earn you bonus AI credits. Once per sponsor per day.
      </p>

      {loading ? (
        <div className="text-[12px] text-muted-foreground mb-6">Loading sponsor stats…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatTile label="Total clicks" value={String(stats?.total ?? 0)} />
          <StatTile label="Rewards claimed" value={String(stats?.rewards ?? 0)} accent="gold" />
          <StatTile label="Credits earned" value={`+${stats?.credits ?? 0}`} accent="emerald" />
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 sm:p-4">
            <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-1">Top sponsor</div>
            <div className="font-display text-base text-luxe truncate">
              {stats?.top?.sponsor ? sponsorLabel(stats.top.sponsor) : '—'}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {stats?.top?.count ? `${stats.top.count} clicks` : 'No clicks yet'}
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-3.5 h-3.5 text-gold-300" />
          <p className="text-[10px] tracking-[0.25em] uppercase text-gold-400/80">Curated offers</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SPONSOR_LIST.map((sponsor) => {
            const busy = busySlug === sponsor.slug
            return (
              <button
                key={sponsor.slug}
                type="button"
                onClick={() => void visitOffer(sponsor.slug, sponsor.reward, sponsor.name)}
                disabled={!!busySlug}
                className={cn(
                  'group text-left rounded-xl p-4 bg-white/[0.03] border border-white/[0.08]',
                  'hover:bg-gold-500/[0.06] hover:border-gold-500/30 transition',
                  busy && 'opacity-70 cursor-wait',
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                    {sponsor.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-gold-300/90 shrink-0">
                    +{sponsor.reward} credits
                    {busy ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                    )}
                  </span>
                </div>
                <div className="font-display text-base text-luxe mb-1">{sponsor.name}</div>
                <p className="text-[11px] text-luxe/70 leading-snug line-clamp-2">{sponsor.tagline}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] tracking-wider uppercase text-gold-300/80">
                  Visit & earn <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'gold' | 'emerald'
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 sm:p-4">
      <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-1">{label}</div>
      <div
        className={cn(
          'font-display text-2xl sm:text-3xl',
          accent === 'gold' && 'text-gold-gradient',
          accent === 'emerald' && 'text-emerald-300',
          !accent && 'text-luxe',
        )}
      >
        {value}
      </div>
    </div>
  )
}
