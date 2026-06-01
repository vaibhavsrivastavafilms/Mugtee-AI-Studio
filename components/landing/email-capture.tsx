'use client'
// Phase V1.2 — Trust Fix #5: Lightweight email capture.
// Stores submitted emails in localStorage + POSTs to /api/lead (server logs only — no CRM yet).
// Idempotent: same email won't be re-submitted.

import { useState } from 'react'
import { Mail, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EMAIL_CAPTURE } from '@/lib/marketing/site-copy'

export function EmailCapture() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setErr(null)
    const e = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setErr('Enter a valid email'); return }
    setBusy(true)
    try {
      // Idempotency check via localStorage so a refresh doesn't double-submit.
      let stored: string[] = []
      try { stored = JSON.parse(localStorage.getItem('mugtee:leads:v1') || '[]') } catch {}
      if (!stored.includes(e)) {
        await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, source: 'landing' }) }).catch(() => {})
        stored.push(e)
        try { localStorage.setItem('mugtee:leads:v1', JSON.stringify(stored.slice(-50))) } catch {}
      }
      setDone(true)
      setTimeout(() => setDone(false), 4000)
      setEmail('')
    } catch (e: any) {
      setErr(e?.message || 'Could not subscribe — try again later')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative rounded-3xl p-6 sm:p-9 glass border border-gold-soft">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-8">
        <div className="max-w-md">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-2">{EMAIL_CAPTURE.eyebrow}</div>
          <h3 className="font-display text-xl sm:text-2xl leading-tight">{EMAIL_CAPTURE.headline}</h3>
          <p className="text-[12px] text-luxe/65 mt-1.5">{EMAIL_CAPTURE.subheadline}</p>
        </div>
        <div className="w-full sm:w-auto flex-1 max-w-md">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !busy) submit() }}
                placeholder="you@studio.com"
                className="w-full pl-9 pr-3 py-3 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-gold-500/50 focus:outline-none text-sm text-luxe placeholder:text-muted-foreground/60"
              />
            </div>
            <button
              onClick={submit}
              disabled={busy || !email.trim()}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition shrink-0 min-h-[48px]',
                (busy || !email.trim())
                  ? 'bg-white/[0.04] border border-white/[0.06] text-muted-foreground cursor-not-allowed'
                  : done
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
                    : 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90',
              )}
            >
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                : done ? <><Check className="w-4 h-4" /> You&apos;re in</>
                : 'Subscribe'}
            </button>
          </div>
          {err && <div className="mt-2 text-[12px] text-rose-300/90">{err}</div>}
        </div>
      </div>
    </div>
  )
}
