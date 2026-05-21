'use client'
// MUGTEE V3.8 — Low Credit "Watch Ad" inline banner.
//
// Behaviour:
//   • Auto-hides for unlimited / paid plans.
//   • Auto-hides above 5 remaining credits — only surfaces when the creator is
//     genuinely running out (5 or fewer).
//   • On click: triggers a lightweight "rewarded ad" simulation \u2014 a 5-second
//     count-down inside a small modal, then calls useUsage().addBonus(5).
//   • Per-day soft cap (3 watches) lives in localStorage so creators can't
//     hammer the button. Real ad-network integration (AdMob / AdSense rewarded)
//     drops in as a single fetch later \u2014 the addBonus contract stays identical.
//
// EXTREME LOW CREDIT MODE: zero new deps, zero new infra, zero new endpoints.

import { useEffect, useState } from 'react'
import { Tv, Loader2, X, Sparkles, Gift } from 'lucide-react'
import { useUsage } from '@/lib/usage'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const DAY_KEY = () => `mugtee:watchad:v1:${new Date().toISOString().slice(0, 10)}`
const DAILY_CAP = 3
const REWARD = 5

export function WatchAdBanner({ compact = false }: { compact?: boolean }) {
  const { remaining, isUnlimited, addBonus } = useUsage()
  const [watchedToday, setWatchedToday] = useState(0)
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(5)

  useEffect(() => {
    try { setWatchedToday(Number(localStorage.getItem(DAY_KEY()) || 0)) } catch {}
  }, [])

  // Hide on paid / unlimited or when credits > 5
  if (isUnlimited) return null
  if (!Number.isFinite(remaining.ai) || (remaining.ai as number) > 5) return null
  if (watchedToday >= DAILY_CAP) return null

  const startWatch = () => {
    if (watchedToday >= DAILY_CAP) { toast.error('Daily reward cap reached \u2014 try again tomorrow.'); return }
    setOpen(true)
    setCount(5)
    let n = 5
    const id = setInterval(() => {
      n -= 1
      setCount(n)
      if (n <= 0) {
        clearInterval(id)
        // Reward
        addBonus?.(REWARD)
        const next = watchedToday + 1
        try { localStorage.setItem(DAY_KEY(), String(next)) } catch {}
        setWatchedToday(next)
        toast.success(`+${REWARD} credits earned`)
        setOpen(false)
      }
    }, 1000)
  }

  return (
    <>
      <button
        onClick={startWatch}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-xl border bg-amber-500/[0.08] border-amber-500/35 hover:bg-amber-500/15 hover:border-amber-400/55 transition text-amber-200',
          compact ? 'px-2.5 py-1 text-[10.5px]' : 'px-3 py-1.5 text-[11px]'
        )}
        title="Watch a short ad to earn 5 free credits"
      >
        <Tv className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition" />
        <span className="font-medium tracking-wide">Watch Ad</span>
        <span className="text-amber-300/85">\u2192 +{REWARD} credits</span>
      </button>

      {/* Lightweight inline countdown "ad" \u2014 zero ad-network integration. The contract
          (addBonus) is identical to a real rewarded ad SDK callback so swapping in
          AdMob / AdSense Rewarded later is a one-line change. */}
      {open && (
        <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl glass-strong border border-gold-500/30 p-6 text-center relative">
            <button
              onClick={() => setOpen(false)}
              aria-label="Skip ad"
              className="absolute top-3 right-3 w-9 h-9 rounded-md hover:bg-white/5 text-muted-foreground hover:text-luxe inline-flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold-500/15 border border-gold-500/35 mb-3">
              {count > 0 ? <Loader2 className="w-6 h-6 text-gold-300 animate-spin" /> : <Gift className="w-6 h-6 text-emerald-300" />}
            </div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80 inline-flex items-center gap-1.5 justify-center mb-1">
              <Sparkles className="w-3 h-3" /> Sponsored
            </div>
            <h3 className="font-display text-xl mb-2">{count > 0 ? `Earning +${REWARD} credits in ${count}\u2026` : 'Credits added'}</h3>
            <p className="text-[12px] text-luxe/70 leading-relaxed">
              Mugtee is supported by short, creator-friendly placements. Thanks for watching \u2014 keep creating.
            </p>
            <p className="mt-3 text-[10px] tracking-wider text-muted-foreground">
              {DAILY_CAP - watchedToday - (open ? 1 : 0)} rewards left today
            </p>
          </div>
        </div>
      )}
    </>
  )
}
