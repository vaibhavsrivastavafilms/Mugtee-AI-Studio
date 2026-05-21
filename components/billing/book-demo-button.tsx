'use client'
// MUGTEE V3.9 — Agency "Book Demo" CTA.
//
// Why: the Agency plan needs a real conversation (custom pricing, onboarding,
// SLA). Sending Agency leads to Razorpay or /login was destroying conversion
// quality.  This is a lightweight 3-field form that composes a WhatsApp deep
// link \u2014 zero backend, zero CRM integration, zero new infra.
//
// On submit: opens wa.me with a pre-filled inquiry. The phone number is read
// from NEXT_PUBLIC_AGENCY_WHATSAPP (E.164, digits only, e.g. 919999999999).
// Falls back to mailto: when the env var isn't set.

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Send, Loader2, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/posthog'

const TEAM_SIZES = ['Just me', '2-5 creators', '6-15 creators', '15+ creators']

const AGENCY_WA = process.env.NEXT_PUBLIC_AGENCY_WHATSAPP || ''   // E.164 digits only
const AGENCY_EMAIL = 'support@tabletales.studio'

export function BookDemoButton({ variant = 'gold', label = 'Book Demo \u00B7 \u20B9999/mo' }: { variant?: 'gold' | 'soft'; label?: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [agency, setAgency] = useState('')
  const [team, setTeam] = useState(TEAM_SIZES[1])
  const [submitting, setSubmitting] = useState(false)

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name.trim() || !agency.trim()) return
    setSubmitting(true)
    const msg =
      `Interested in Mugtee Agency Studio.\n\n` +
      `Name: ${name.trim()}\n` +
      `Agency/Company: ${agency.trim()}\n` +
      `Team size: ${team}\n\n` +
      `Please share onboarding & pricing details.`
    // Prefer WhatsApp deep link when a number is configured, else mailto fallback.
    const target = AGENCY_WA
      ? `https://wa.me/${AGENCY_WA}?text=${encodeURIComponent(msg)}`
      : `mailto:${AGENCY_EMAIL}?subject=${encodeURIComponent('Mugtee Agency Studio inquiry')}&body=${encodeURIComponent(msg)}`
    window.open(target, '_blank', 'noopener,noreferrer')
    // Close after a tick so the link launches cleanly on iOS Safari.
    setTimeout(() => { setSubmitting(false); setOpen(false) }, 400)
  }

  return (
    <>
      <Button
        onClick={() => { setOpen(true); track('agency_demo_clicked', { source: 'pricing_card' }) }}
        className={cn(
          'w-full h-11 gap-2',
          variant === 'gold'
            ? 'bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow'
            : 'bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-gold-500/30 hover:border-gold-500/60'
        )}
      >
        <Users className="w-4 h-4" /> {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong border border-gold-500/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl inline-flex items-center gap-2">
              <Users className="w-5 h-5 text-gold-400" /> Book an Agency Studio demo
            </DialogTitle>
          </DialogHeader>
          <p className="text-[12.5px] text-luxe/80 leading-relaxed -mt-1">
            Share a few details and we\u2019ll open a quick chat to walk you through team workflows, onboarding and pricing.
          </p>
          <form onSubmit={submit} className="space-y-3 mt-2">
            <div className="space-y-1">
              <label className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Your name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Aakash Patel" className="bg-white/[0.03] h-11" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Agency / Company</label>
              <Input value={agency} onChange={e => setAgency(e.target.value)} placeholder="Mugtee Studios" className="bg-white/[0.03] h-11" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Team size</label>
              <div className="flex flex-wrap gap-1.5">
                {TEAM_SIZES.map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => setTeam(t)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-full text-[11px] tracking-wide border transition',
                      team === t
                        ? 'bg-gold-500/15 border-gold-500/45 text-gold-200'
                        : 'bg-white/[0.03] border-white/[0.08] text-luxe/80 hover:border-gold-500/35 hover:text-gold-200'
                    )}
                  >{t}</button>
                ))}
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting || !name.trim() || !agency.trim()}
              className="w-full h-11 bg-gold-gradient text-black shadow-gold-glow gap-2 disabled:opacity-50"
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : AGENCY_WA ? <MessageCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {AGENCY_WA ? 'Open WhatsApp \u2192' : 'Send Email \u2192'}
            </Button>
            <p className="text-[10.5px] text-muted-foreground text-center">
              No card required \u00B7 We\u2019ll reply within one business day.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
