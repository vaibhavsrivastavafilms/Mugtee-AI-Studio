'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Gift, Link2, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getReferralMilestones } from '@/lib/billing/referral-rewards'

type ReferralData = {
  code: string
  link: string
  invites_sent: number
  successful_signups: number
  rewards_earned: number
  bonus_generations: number
  creator_plan_bonus: boolean
  next_milestone: { referrals: number; label: string } | null
}

const MILESTONES = getReferralMilestones()

export function InviteCreatorsSection() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/referral', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setData(json as ReferralData)
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const copyLink = async () => {
    if (!data?.link) return
    try {
      await navigator.clipboard.writeText(data.link)
      toast.success('Referral link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  const progressPct = data?.next_milestone
    ? Math.min(
        100,
        Math.round(
          (data.successful_signups / data.next_milestone.referrals) * 100
        )
      )
    : data?.creator_plan_bonus
      ? 100
      : 0

  return (
    <motion.div
      id="invite-creators"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.09 }}
      className="glass rounded-2xl p-6 sm:p-8 scroll-mt-24"
    >
      <div className="flex items-center gap-2 mb-1">
        <UserPlus className="w-4 h-4 text-gold-400" />
        <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80">
          Invite Creators
        </div>
      </div>
      <h2 className="font-display text-2xl mb-1">Creator Referral Program</h2>
      <p className="text-luxe/70 text-sm mb-5">
        Share your link. Earn bonus generations when creators join Mugtee.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading referral…
        </div>
      ) : data ? (
        <>
          <div className="space-y-2 mb-5">
            <label className="text-xs tracking-wider uppercase text-muted-foreground">
              Your referral link
            </label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={data.link}
                className="bg-white/[0.03] h-11 font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 border-gold-soft/40"
                onClick={copyLink}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Code: {data.code}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
                Invitations sent
              </div>
              <div className="font-display text-2xl text-luxe">{data.invites_sent}</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
                Successful signups
              </div>
              <div className="font-display text-2xl text-gold-gradient">
                {data.successful_signups}
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
                Rewards earned
              </div>
              <div className="font-display text-2xl text-emerald-300">
                +{data.rewards_earned}
              </div>
              <div className="text-[10px] text-muted-foreground">bonus generations</div>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Referral progress</span>
              <span className="text-luxe/80">
                {data.successful_signups} invited
                {data.next_milestone
                  ? ` · ${data.next_milestone.referrals} for ${data.next_milestone.label}`
                  : data.creator_plan_bonus
                    ? ' · Creator Plan Bonus unlocked'
                    : ''}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  data.creator_plan_bonus
                    ? 'bg-gradient-to-r from-gold-400 to-amber-500'
                    : 'bg-gold-gradient'
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] tracking-[0.25em] uppercase text-gold-400/70 mb-2 flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5" /> Available rewards
            </div>
            <ul className="space-y-1.5 text-sm text-luxe/75">
              {MILESTONES.map((m) => (
                <li
                  key={m.referrals}
                  className={cn(
                    'flex justify-between gap-2 rounded-lg px-3 py-2 border',
                    data.successful_signups >= m.referrals
                      ? 'border-gold-soft/30 bg-gold-500/5 text-luxe'
                      : 'border-white/[0.06] bg-white/[0.02]'
                  )}
                >
                  <span>
                    {m.referrals} referral{m.referrals > 1 ? 's' : ''} — {m.label}
                  </span>
                  <span className="text-gold-300/90 shrink-0">
                    {m.creatorPlanBonus
                      ? 'Creator Plan Bonus'
                      : `+${m.bonusGenerations} gen`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="text-sm text-luxe/50">Sign in to get your referral link.</p>
      )}
    </motion.div>
  )
}
