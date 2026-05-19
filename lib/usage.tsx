'use client'
// Phase FINAL — Monetization primitives. localStorage-based usage tracking (free plan gating),
// upgrade modal, and dashboard usage gauge — all in one file to keep the footprint minimal.
// No DB, no schema, no migrations. Plan upgrades will be authoritatively flipped after Razorpay
// integration ships; until then, paying users can manually set localStorage['virlo:plan'].

import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Sparkles, Crown, Check, X, Zap, ArrowRight, Lock, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RazorpayCheckoutButton } from '@/components/billing/razorpay-checkout-button'

export type Plan = 'free' | 'creator' | 'agency'

// FREE plan caps — per calendar month, tracked client-side.
export const LIMITS: Record<Plan, { ai: number; scripts: number; planner: number }> = {
  free:    { ai: 25,  scripts: 5,  planner: 2  },     // generous trial
  creator: { ai: 9999, scripts: 9999, planner: 9999 },
  agency:  { ai: 9999, scripts: 9999, planner: 9999 },
}

const STORAGE_KEY = 'virlo:usage:v1'
const PLAN_KEY    = 'virlo:plan'

type UsageRow = { month: string; ai: number; scripts: number; planner: number; bonus: number; bonusDay: string }

function monthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function dayKey() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function readUsage(): UsageRow {
  if (typeof window === 'undefined') return { month: monthKey(), ai: 0, scripts: 0, planner: 0, bonus: 0, bonusDay: dayKey() }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as UsageRow
      // monthly reset of counters; daily reset of bonus credits
      const today = dayKey()
      const sameMonth = parsed.month === monthKey()
      return {
        month:    sameMonth ? parsed.month : monthKey(),
        ai:       sameMonth ? (parsed.ai      || 0) : 0,
        scripts:  sameMonth ? (parsed.scripts || 0) : 0,
        planner:  sameMonth ? (parsed.planner || 0) : 0,
        bonus:    parsed.bonusDay === today ? (parsed.bonus || 0) : 0,
        bonusDay: parsed.bonusDay === today ? parsed.bonusDay : today,
      }
    }
  } catch {}
  return { month: monthKey(), ai: 0, scripts: 0, planner: 0, bonus: 0, bonusDay: dayKey() }
}

function writeUsage(u: UsageRow) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)) } catch {}
}

function readPlan(): Plan {
  if (typeof window === 'undefined') return 'free'
  try { return (localStorage.getItem(PLAN_KEY) as Plan) || 'free' } catch { return 'free' }
}

// Hook: returns plan, usage, and a gated call helper.
// "kind": which counter to increment. "ai" is the default; scripts/planner are subsets that ALSO bump ai.
export function useUsage() {
  const [plan, setPlan]   = useState<Plan>('free')
  const [usage, setUsage] = useState<UsageRow>({ month: monthKey(), ai: 0, scripts: 0, planner: 0 })
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<string>('')

  useEffect(() => {
    setPlan(readPlan())
    setUsage(readUsage())
    // Phase P2 — server-truth bootstrap: read /api/billing/me and reconcile localStorage.
    // Cookie-authenticated; harmless on logout (returns 'free'). Runs once per mount.
    fetch('/api/billing/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => {
        if (!d) return
        const serverPlan = (d.plan === 'creator' || d.plan === 'agency') ? d.plan as Plan : 'free'
        try { localStorage.setItem(PLAN_KEY, serverPlan) } catch {}
        setPlan(serverPlan)
      })
      .catch(() => {})
    // cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setUsage(readUsage())
      if (e.key === PLAN_KEY)    setPlan(readPlan())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const limit = LIMITS[plan]
  // Phase P7 — bonus pool effectively raises the AI cap. Scripts/planner draws from same pool conceptually:
  // we DON'T inflate those individually; rewarded credits are positioned as "AI generations" topup.
  const remaining = {
    ai:      Math.max(0, (limit.ai + (usage.bonus || 0)) - usage.ai),
    scripts: Math.max(0, limit.scripts - usage.scripts),
    planner: Math.max(0, limit.planner - usage.planner),
    bonus:   usage.bonus || 0,
  }

  // Returns true if call is allowed; if not, opens upgrade modal and returns false.
  const guard = useCallback((kind: 'ai' | 'scripts' | 'planner' = 'ai'): boolean => {
    if (plan !== 'free') return true
    const u = readUsage()
    const lim = LIMITS.free
    const hitScripts = kind === 'scripts' && u.scripts >= lim.scripts
    const hitPlanner = kind === 'planner' && u.planner >= lim.planner
    const hitAi      = u.ai >= (lim.ai + (u.bonus || 0))   // bonus credits raise the AI cap
    if (hitScripts || hitPlanner || hitAi) {
      setUpgradeReason(
        hitPlanner ? 'Weekly Planner runs'
        : hitScripts ? 'Cinematic Scripts'
        : 'AI generations'
      )
      setUpgradeOpen(true)
      return false
    }
    return true
  }, [plan])

  // Increment counters AFTER a successful AI call.
  const bump = useCallback((kind: 'ai' | 'scripts' | 'planner' = 'ai') => {
    if (plan !== 'free') return
    const u = readUsage()
    const next: UsageRow = { ...u, ai: u.ai + 1 }
    if (kind === 'scripts') next.scripts = u.scripts + 1
    if (kind === 'planner') next.planner = u.planner + 1
    writeUsage(next)
    setUsage(next)
  }, [plan])

  // Phase P7 — grant N bonus AI credits (today only; resets at midnight via dayKey check on read).
  const addBonus = useCallback((n = 3) => {
    const u = readUsage()
    const next: UsageRow = { ...u, bonus: (u.bonus || 0) + n, bonusDay: dayKey() }
    writeUsage(next)
    setUsage(next)
  }, [])

  return { plan, usage, limit, remaining, guard, bump, addBonus, upgradeOpen, setUpgradeOpen, upgradeReason }
}

// Standalone modal — drop anywhere; controlled via useUsage().upgradeOpen.
// Phase P7 — Free users get an inline "Watch sponsor → +3 credits" CTA that opens a lightweight rewarded experience.
export function UpgradeModal({ open, onOpenChange, reason }: { open: boolean; onOpenChange: (v: boolean) => void; reason?: string }) {
  const { plan, addBonus } = useUsage()
  const [rewardedOpen, setRewardedOpen] = useState(false)
  const showRewarded = plan === 'free'
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg border border-gold-soft">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-400/80">
            <Crown className="w-3 h-3" /> Upgrade Virlo
          </div>
          <DialogTitle className="font-display text-2xl sm:text-3xl">
            You've hit the <span className="text-gold-gradient">free monthly cap</span>
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            {reason ? `Out of ${reason} this month. ` : ''}Unlock unlimited AI + scripts + planner with Creator — or watch a sponsor for 3 free credits.
          </p>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <div className="rounded-xl p-4 bg-gold-500/[0.08] border border-gold-500/30">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-gold-300" /><span className="font-display text-lg">Creator</span></div>
              <div className="text-sm font-medium"><span className="text-gold-gradient">₹245</span><span className="text-muted-foreground text-xs">/month</span></div>
            </div>
            <ul className="text-[12px] text-luxe/85 space-y-1 mt-2">
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-gold-400" /> Unlimited AI generations</li>
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-gold-400" /> Unlimited cinematic scripts</li>
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-gold-400" /> Unlimited weekly planner runs</li>
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-gold-400" /> Faceless YouTube intelligence</li>
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-gold-400" /> No ads · cinematic UI</li>
            </ul>
          </div>
          <div className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-gold-300/80" /><span className="font-display text-base">Agency</span></div>
              <div className="text-xs font-medium"><span className="text-gold-gradient">₹999</span><span className="text-muted-foreground">/month · 5 users</span></div>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Realtime collaboration · team workflow · advanced automations</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-3 mt-1 border-t border-white/[0.05]">
          <RazorpayCheckoutButton plan="creator" label="Upgrade to Creator · ₹245/mo" onSuccess={() => onOpenChange(false)} />
          <div className="flex flex-wrap items-center gap-2">
            {showRewarded && (
              <button onClick={() => setRewardedOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-gold-500/30 hover:bg-gold-500/[0.08] hover:border-gold-500/50 text-luxe text-xs tracking-wide transition">
                <Gift className="w-3.5 h-3.5 text-gold-300" /> Watch sponsor · +3 credits
              </button>
            )}
            <Link href="/pricing" onClick={() => onOpenChange(false)} className="text-[11px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 transition">
              See all plans →
            </Link>
            <button onClick={() => onOpenChange(false)} className="ml-auto px-3 py-2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition">Maybe later</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <RewardedSponsorModal
      open={rewardedOpen}
      onOpenChange={setRewardedOpen}
      onReward={(n) => { addBonus(n); onOpenChange(false) }}
    />
    </>
  )
}

// Phase P7 — Rewarded sponsor experience. Lightweight, no ad SDK, no autoplay audio.
// Shows a sponsor card with a 5-second engagement timer → grants +3 AI credits.
const SPONSORS: { name: string; tagline: string; href: string; category: string }[] = [
  { name: 'CapCut',     tagline: 'Free pro-grade video editor for creators on every device.',                            href: 'https://www.capcut.com',     category: 'Editing' },
  { name: 'ElevenLabs', tagline: 'Hyper-realistic AI voices in 30+ languages — narrate any faceless script.',           href: 'https://elevenlabs.io',      category: 'Voice AI' },
  { name: 'Descript',   tagline: 'Edit video by editing the transcript. Remove filler words in one click.',             href: 'https://www.descript.com',   category: 'Editing' },
  { name: 'Notion AI',  tagline: 'Organize ideas, outlines and creator notes in one calm workspace.',                   href: 'https://www.notion.so',      category: 'Workspace' },
  { name: 'Adobe Express', tagline: 'Thumbnail design + social graphics in seconds. Free templates included.',          href: 'https://www.adobe.com/express/', category: 'Design' },
]

export function RewardedSponsorModal({ open, onOpenChange, onReward }: { open: boolean; onOpenChange: (v: boolean) => void; onReward: (n: number) => void }) {
  const [sponsor] = useState(() => SPONSORS[Math.floor(Math.random() * SPONSORS.length)])
  const [seconds, setSeconds] = useState(5)
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    if (!open) { setSeconds(5); setClaimed(false); return }
    if (claimed) return
    if (seconds <= 0) return
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [open, seconds, claimed])

  const ready = seconds <= 0
  const claim = () => {
    if (!ready || claimed) return
    setClaimed(true)
    onReward(3)
    setTimeout(() => onOpenChange(false), 900)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-md border border-gold-soft">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-400/80">
            <Gift className="w-3 h-3" /> Sponsored · earn +3 AI credits
          </div>
          <DialogTitle className="font-display text-xl sm:text-2xl">
            Discover <span className="text-gold-gradient">{sponsor.name}</span>
          </DialogTitle>
        </DialogHeader>

        <a href={sponsor.href} target="_blank" rel="noopener noreferrer sponsored"
          className="block rounded-xl p-4 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] hover:border-gold-500/30 transition group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground">{sponsor.category}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground/60 group-hover:text-gold-300 transition" />
          </div>
          <div className="font-display text-lg mb-1">{sponsor.name}</div>
          <p className="text-[12px] text-luxe/80 leading-relaxed">{sponsor.tagline}</p>
          <div className="mt-3 text-[10px] tracking-[0.25em] uppercase text-gold-300/70 group-hover:text-gold-300 transition inline-flex items-center gap-1">Visit {sponsor.name} <ArrowRight className="w-3 h-3" /></div>
        </a>

        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          {!claimed ? (
            <button
              onClick={claim}
              disabled={!ready}
              className={cn(
                'w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition min-h-[44px]',
                ready
                  ? 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90'
                  : 'bg-white/[0.04] text-muted-foreground cursor-not-allowed'
              )}
            >
              {ready ? <><Gift className="w-4 h-4" /> Claim +3 AI credits</> : <><span className="tabular-nums">Unlocks in {seconds}s</span></>}
            </button>
          ) : (
            <div className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 min-h-[44px]">
              <Check className="w-4 h-4" /> +3 credits added · enjoy creating!
            </div>
          )}
          <div className="text-[10px] text-center text-muted-foreground mt-2">Lightweight sponsor placement · no autoplay audio · resets daily.</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper — readable countdown to the next monthly reset
function nextMonthResetIn(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const diffMs = next.getTime() - now.getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days >= 2) return `Resets in ${days} days`
  if (days === 1) return 'Resets tomorrow'
  const hours = Math.max(1, Math.floor(diffMs / 3600000))
  return `Resets in ${hours}h`
}

// Dashboard usage gauge widget
export function UsageGauge() {
  const { plan, usage, limit, remaining } = useUsage()
  if (plan !== 'free') {
    return (
      <div className="rounded-xl glass border border-gold-500/30 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-gold-300" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-gold-300">{plan === 'creator' ? 'Creator' : 'Agency'} plan</span>
          </div>
          <span className="text-[10px] text-muted-foreground tracking-wider uppercase">Unlimited</span>
        </div>
        <div className="text-sm text-luxe mt-2">All AI generations, scripts &amp; planner runs are unlimited.</div>
      </div>
    )
  }
  const aiPct      = Math.min(100, Math.round((usage.ai      / limit.ai)      * 100))
  const scriptsPct = Math.min(100, Math.round((usage.scripts / limit.scripts) * 100))
  const plannerPct = Math.min(100, Math.round((usage.planner / limit.planner) * 100))
  const Row = ({ label, used, max, pct }: { label: string; used: number; max: number; pct: number }) => (
    <div>
      <div className="flex items-center justify-between text-[10px] tracking-wider uppercase text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="tabular-nums text-luxe/80">{used}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-red-400/80' : pct >= 80 ? 'bg-amber-400' : 'bg-gold-gradient')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
  return (
    <div className="rounded-xl glass border border-white/[0.06] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold-400" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-gold-300">Free plan · this month</span>
        </div>
        <Link href="/pricing" className="inline-flex items-center gap-1 text-[10px] tracking-wider uppercase text-gold-300 hover:text-gold-200 transition">
          Upgrade <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2.5">
        <Row label="AI generations" used={usage.ai}      max={limit.ai}      pct={aiPct} />
        <Row label="Cinematic scripts" used={usage.scripts} max={limit.scripts} pct={scriptsPct} />
        <Row label="Weekly plans"   used={usage.planner} max={limit.planner} pct={plannerPct} />
      </div>
      <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between gap-2">
        <div className="text-[10px] text-muted-foreground tracking-wider">
          {nextMonthResetIn()}{remaining.bonus > 0 && <span className="text-gold-300/80"> · +{remaining.bonus} bonus credits</span>}
        </div>
        {(aiPct >= 80 || scriptsPct >= 80 || plannerPct >= 80) && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-200/90">
            <Lock className="w-3 h-3 text-amber-300" /> Running low
          </div>
        )}
      </div>
    </div>
  )
}

// Subtle sponsor slot — empty by default, hidden when no sponsor configured.
// Renders only in dashboard/onboarding/empty-state contexts (never inside script/calendar/AI workflow).
export function SponsorSlot({ placement = 'dashboard', sponsor }: { placement?: 'dashboard' | 'onboarding' | 'empty'; sponsor?: { name: string; tagline: string; href: string } | null }) {
  if (!sponsor) return null
  return (
    <a href={sponsor.href} target="_blank" rel="noopener noreferrer sponsored"
      className="block rounded-xl glass border border-white/[0.06] hover:border-gold-500/30 p-3 transition-colors group">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground">Sponsored · {placement}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground/60 group-hover:text-gold-300 transition" />
      </div>
      <div className="text-sm font-medium mt-1">{sponsor.name}</div>
      <div className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{sponsor.tagline}</div>
    </a>
  )
}
