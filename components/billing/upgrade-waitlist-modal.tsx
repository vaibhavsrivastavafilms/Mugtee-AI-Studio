'use client'

import { useEffect, useState } from 'react'
import { Crown, Loader2 } from 'lucide-react'
import type { PlanCatalogEntry, PlanInterest } from '@/lib/billing/plan-catalog'
import { track } from '@/lib/posthog'
import {
  RevenueEventTypes,
  trackRevenueValidation,
} from '@/lib/analytics/revenue-validation.client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: PlanCatalogEntry | null
}

export function UpgradeWaitlistModal({ open, onOpenChange, plan }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user && !cancelled) {
            setEmail(user.email || '')
            const meta = user.user_metadata || {}
            const fromMeta = (meta.full_name as string) || (meta.name as string) || ''
            if (fromMeta) setName(fromMeta)
          }
        }
        const res = await fetch('/api/upgrade-interest', { cache: 'no-store' })
        if (res.ok && !cancelled) {
          const data = await res.json()
          const match = (data.entries || []).find(
            (e: { plan_interest: string }) => e.plan_interest === plan?.id
          )
          if (match) {
            setName(match.name || '')
            setEmail(match.email || '')
          }
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, plan?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plan) return
    if (!name.trim() || !email.trim()) {
      toast.error('Please enter your name and email')
      return
    }

    setSubmitting(true)
    track('upgrade_click', { plan: plan.id, source: 'waitlist_modal' })
    trackRevenueValidation({
      eventType: RevenueEventTypes.PAYMENT_ATTEMPTS,
      planInterest: plan.id,
      source: 'waitlist_modal_submit',
    })

    try {
      const res = await fetch('/api/upgrade-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          plan_interest: plan.id as PlanInterest,
          source: 'waitlist_modal',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not join waitlist')
      toast.success(`You're on the ${plan.name} waitlist! We'll email you when upgrades launch.`)
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (!plan) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-gold-500/25 bg-[var(--v2-surface)] text-[var(--v2-text-primary)] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-[var(--v2-gold)]" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--v2-text-secondary)]">
              Upgrade waitlist
            </span>
          </div>
          <DialogTitle className="font-display text-2xl">
            Join the <span className="text-gold-gradient">{plan.name}</span> plan
          </DialogTitle>
          <DialogDescription className="text-[var(--v2-text-secondary)]">
            Billing is not live yet — leave your details and we&apos;ll notify you at launch with
            early-access pricing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5 block">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-white/[0.04] border-white/[0.08]"
              maxLength={120}
              required
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5 block">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              className="bg-white/[0.04] border-white/[0.08]"
              maxLength={254}
              required
            />
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-sm text-luxe/80">
            <span className="text-[10px] tracking-[0.2em] uppercase text-gold-400/80 block mb-2">
              Plan interest
            </span>
            {plan.name} — {plan.badge}
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Joining…
              </>
            ) : (
              'Join Waitlist'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
