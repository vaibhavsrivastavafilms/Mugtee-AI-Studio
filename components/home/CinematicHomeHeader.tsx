'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { HOME_NAV, outlineGoldButton, STUDIO_ENTRY } from '@/components/home/cinematic-home-styles'

type CinematicHomeHeaderProps = {
  className?: string
}

export function CinematicHomeHeader({ className }: CinematicHomeHeaderProps) {
  const router = useRouter()

  const handleStartCreating = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push(STUDIO_ENTRY)
  }

  return (
    <header className={cn('sticky top-0 z-50 px-3 py-3 sm:px-5', className)}>
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-4 rounded-full border border-[rgba(212,175,55,0.18)] bg-[#0D0D0D]/80 px-4 py-2 shadow-[0_16px_42px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-6">
        <Link href="/" className="shrink-0 group hover:opacity-90 transition-opacity">
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

        <button
          type="button"
          onClick={handleStartCreating}
          className={cn(outlineGoldButton, 'shrink-0 px-4 py-2 min-h-[38px] text-[10px]')}
        >
          Start creating
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" aria-hidden />
        </button>
      </div>
    </header>
  )
}
