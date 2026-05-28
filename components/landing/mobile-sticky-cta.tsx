'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { MOBILE_CTA } from '@/lib/marketing/site-copy'

export function MobileStickyCta() {
  return (
    <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
      <Link
        href="/quick-cut/preview"
        className="pointer-events-auto flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gold-gradient text-black text-sm font-medium shadow-gold-glow hover:opacity-90 transition-opacity"
      >
        <Sparkles className="w-4 h-4" /> {MOBILE_CTA}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
