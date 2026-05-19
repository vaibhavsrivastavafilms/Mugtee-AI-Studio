'use client'
// Phase P2 — Razorpay Checkout client wrapper.
// Reuses existing premium UI; opens Razorpay Standard Checkout with a subscription_id
// returned by our backend, then verifies signature server-side via /api/billing/verify.

import { useCallback, useState } from 'react'
import Script from 'next/script'
import { Crown, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

declare global { interface Window { Razorpay: any } }

type Plan = 'creator' | 'agency'

export function RazorpayCheckoutButton({
  plan,
  label,
  className,
  variant = 'gold',
  onSuccess,
}: {
  plan: Plan
  label?: string
  className?: string
  variant?: 'gold' | 'soft'
  onSuccess?: (plan: Plan) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleClick = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      // 1. Create subscription on our server
      const res = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Please sign in first')
          window.location.href = '/login'
          return
        }
        throw new Error(data.error || 'Could not start checkout')
      }

      // 2. Wait for Razorpay script
      if (typeof window === 'undefined' || !window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const t0 = Date.now()
          const wait = () => {
            if (window.Razorpay) return resolve()
            if (Date.now() - t0 > 8000) return reject(new Error('Razorpay script did not load'))
            setTimeout(wait, 100)
          }
          wait()
        })
      }

      // 3. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'Mugtee',
        description: plan === 'creator' ? 'Creator plan \u00B7 \u20B9245 / month' : 'Agency plan \u00B7 \u20B9999 / month',
        prefill: { email: data.email || '' },
        theme: { color: '#D4AF37', backdrop_color: 'rgba(10,8,7,0.92)' },
        notes: { plan },
        handler: async (payload: any) => {
          try {
            const v = await fetch('/api/billing/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            const vData = await v.json()
            if (!v.ok || !vData.ok) throw new Error(vData.error || 'Verification failed')
            // Sync localStorage immediately (optimistic) so gating updates instantly
            try { localStorage.setItem('virlo:plan', vData.plan) } catch {}
            toast.success(`Welcome to ${vData.plan === 'creator' ? 'Creator' : 'Agency'} \u2014 unlimited unlocked`)
            onSuccess?.(vData.plan)
            // Hard refresh so server-rendered UI (and any cached state) re-reads plan
            setTimeout(() => window.location.reload(), 700)
          } catch (e: any) {
            toast.error(e?.message || 'Payment captured but verification failed \u2014 contact support')
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      })
      rzp.on('payment.failed', (resp: any) => {
        console.error('[razorpay.payment.failed]', resp)
        toast.error(resp?.error?.description || 'Payment failed')
        setLoading(false)
      })
      rzp.open()
    } catch (e: any) {
      toast.error(e?.message || 'Could not start checkout')
      setLoading(false)
    }
  }, [loading, plan, onSuccess])

  const goldClasses = 'bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow'
  const softClasses = 'bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-gold-500/30 hover:border-gold-500/60'

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <button
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'w-full h-11 inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold tracking-wide transition disabled:opacity-60 disabled:cursor-not-allowed',
          variant === 'gold' ? goldClasses : softClasses,
          className,
        )}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Opening Razorpay…</>
        ) : (
          <>
            <Crown className="w-4 h-4" />
            {label || (plan === 'creator' ? 'Upgrade to Creator · ₹245/mo' : 'Upgrade to Agency · ₹999/mo')}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
        <ShieldCheck className="w-3 h-3 text-emerald-400/80" /> Secure · Razorpay Test Mode
      </div>
    </>
  )
}
