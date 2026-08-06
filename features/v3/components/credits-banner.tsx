'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

type CreditsPayload = {
  plan_type?: string
  unlimited?: boolean
  display?: { generations?: string }
  remaining?: { generations?: number | null }
}

export function V3CreditsBanner() {
  const [credits, setCredits] = useState<CreditsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/billing/credits', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as CreditsPayload
        setCredits(data)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm text-white/45">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading credits…
      </div>
    )
  }

  if (!credits) return null

  const planLabel = String(credits.plan_type ?? 'FREE').replace(/_/g, ' ')
  const generationsLabel = credits.unlimited
    ? 'Unlimited generations'
    : credits.display?.generations
      ? `${credits.display.generations} generations left`
      : 'Credits available'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(212,175,55,0.2)] bg-[#111111] px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-[#E6C76A]" />
        <span className="text-white/70">
          <span className="font-medium text-white/90">{planLabel}</span>
          <span className="text-white/35"> · </span>
          {generationsLabel}
        </span>
      </div>
      {!credits.unlimited && (credits.remaining?.generations ?? 1) <= 1 ? (
        <Link
          href="/pricing"
          className="rounded-lg border border-[rgba(212,175,55,0.35)] px-3 py-1.5 text-xs font-medium text-[#F4E7A8] hover:bg-[#D4AF37]/10"
        >
          Upgrade
        </Link>
      ) : null}
    </div>
  )
}
