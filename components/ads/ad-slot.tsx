'use client'
// Phase 16 — Lazy AdSense slot for free-tier users.
// • Renders ONLY when plan === 'free' (zero ads for Creator/Agency).
// • Lazy-loaded via IntersectionObserver (no ad request until visible).
// • Gracefully no-ops if NEXT_PUBLIC_ADSENSE_CLIENT or the slot env is absent
//   (safe to ship before AdSense approval comes through).
// • Cinematic dark wrapper preserves premium feel.

import { useEffect, useRef, useState } from 'react'
import { useUsage } from '@/lib/usage'

declare global { interface Window { adsbygoogle?: any[] } }

interface AdSlotProps {
  /** AdSense slot ID (the publisher ID is global). */
  slot: string
  /** AdSense ad format. 'auto' is responsive and Google-recommended. */
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical'
  /** Force fixed dimensions if you really need them. Otherwise responsive. */
  fullWidthResponsive?: boolean
  /** Optional eyebrow override. Defaults to 'Sponsored'. */
  label?: string
  className?: string
}

export function AdSlot({
  slot,
  format = 'auto',
  fullWidthResponsive = true,
  label = 'Sponsored',
  className = '',
}: AdSlotProps) {
  const { plan } = useUsage()
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  const [visible, setVisible] = useState(false)
  const [pushed, setPushed] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  // 1) Gate: never for paid plans, never without env config, never without slot.
  const shouldRender = plan === 'free' && !!client && !!slot

  // 2) IntersectionObserver — only mount the AdSense <ins> when in viewport.
  useEffect(() => {
    if (!shouldRender || !ref.current) return
    const el = ref.current
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setVisible(true); io.disconnect() } })
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [shouldRender])

  // 3) Push once the <ins> is in the DOM.
  useEffect(() => {
    if (!visible || pushed) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      setPushed(true)
    } catch (e) {
      // AdSense isn't loaded yet or blocked by an ad-blocker. Silent.
      // The slot wrapper will quietly remain empty — preserves layout.
    }
  }, [visible, pushed])

  if (!shouldRender) return null

  return (
    <div ref={ref} className={`my-6 ${className}`} aria-label="Sponsored content">
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/70">{label}</span>
          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/40">Ad</span>
        </div>
        {visible ? (
          <ins
            className="adsbygoogle block"
            style={{ display: 'block', minHeight: 90, background: 'transparent' }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
          />
        ) : (
          // Pre-load placeholder reserves space — prevents CLS (Cumulative Layout Shift)
          <div className="min-h-[90px]" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
