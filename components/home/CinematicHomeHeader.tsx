'use client'

import Link from 'next/link'
import { Menu, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { HOME_NAV, outlineGoldButton, STUDIO_ENTRY } from '@/components/home/cinematic-home-styles'

type CinematicHomeHeaderProps = {
  className?: string
}

export function CinematicHomeHeader({ className }: CinematicHomeHeaderProps) {
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleStartCreating = (e: React.MouseEvent) => {
    e.preventDefault()
    setMobileNavOpen(false)
    router.push(STUDIO_ENTRY)
  }

  return (
    <header className={cn('sticky top-0 z-50 safe-area-top px-3 py-3 sm:px-5', className)}>
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 rounded-full border border-[rgba(212,175,55,0.18)] bg-[#0D0D0D]/80 px-3 py-2 shadow-[0_16px_42px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-6">
        <Link href="/" className="group shrink-0 hover:opacity-90 transition-opacity">
          <span className="block font-display text-xl sm:text-2xl tracking-[-0.03em] text-white leading-none">
            Mugtee
          </span>
          <span className="block text-[9px] sm:text-[10px] tracking-[0.24em] uppercase text-[#888888] mt-0.5">
            Creative Companion
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Landing navigation">
          {HOME_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#B8B8B8] transition-colors hover:text-[#D4AF37] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/25 rounded-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleStartCreating}
            className={cn(outlineGoldButton, 'hidden sm:inline-flex px-4 py-2 min-h-[44px] text-[10px]')}
          >
            Start creating
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" aria-hidden />
          </button>

          <button
            type="button"
            className="inline-flex lg:hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[rgba(212,175,55,0.25)] text-[#D4AF37] touch-manipulation"
            aria-expanded={mobileNavOpen}
            aria-controls="landing-mobile-nav"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileNavOpen ? (
        <nav
          id="landing-mobile-nav"
          aria-label="Mobile landing navigation"
          className="mx-auto mt-2 max-w-6xl rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#0D0D0D]/95 p-3 shadow-xl backdrop-blur-xl lg:hidden"
        >
          <ul className="space-y-1">
            {HOME_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-medium text-[#B8B8B8] hover:bg-white/[0.04] hover:text-[#D4AF37]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={handleStartCreating}
                className={cn(outlineGoldButton, 'mt-1 w-full min-h-[44px] justify-center text-xs sm:hidden')}
              >
                Start creating
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
