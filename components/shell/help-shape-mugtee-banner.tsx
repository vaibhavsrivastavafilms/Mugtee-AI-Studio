'use client'

import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

export function HelpShapeMugteeBanner() {
  return (
    <div className="mb-4 rounded-xl border border-gold-500/20 bg-gold-500/[0.06] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <MessageSquare className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-luxe">Help Shape Mugtee</p>
          <p className="text-[11px] text-luxe/55 mt-0.5">
            Join the Founding Creator Beta and tell us what to build next.
          </p>
        </div>
      </div>
      <Link
        href="/settings#founding-creator"
        className="shrink-0 inline-flex items-center justify-center min-h-[36px] px-4 rounded-lg bg-gold-gradient text-black text-[11px] font-semibold tracking-[0.12em] uppercase hover:opacity-90 transition"
      >
        Share Feedback
      </Link>
    </div>
  )
}
