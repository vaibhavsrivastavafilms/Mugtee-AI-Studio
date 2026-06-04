'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { authLoginHref, persistModeEntry } from '@/lib/create/mode-selection'
import { useRouter } from 'next/navigation'
import { HOME_NAV, outlineGoldButton, STUDIO_QUICK } from '@/components/home/cinematic-home-styles'

type CinematicHomeHeaderProps = {
  className?: string
}

export function CinematicHomeHeader({ className }: CinematicHomeHeaderProps) {
  const router = useRouter()
  const { ready, user } = useAuthHydration()

  const handleStartCreating = (e: React.MouseEvent) => {
    e.preventDefault()
    persistModeEntry('quick')
    if (!ready) return
    if (user) {
      router.push(STUDIO_QUICK)
      return
    }
    router.push(authLoginHref('quick'))
  }

  return (
    <header
      className={cn(
        'shrink-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-md',
        className
      )}
    >
      <div className="mx-auto flex h-14 lg:h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 group hover:opacity-90 transition-opacity">
          <span className="block font-display text-xl sm:text-2xl tracking-[0.12em] uppercase text-[#D4AF37] leading-none">
            Mugtee
          </span>
          <span className="block text-[9px] sm:text-[10px] tracking-[0.32em] uppercase text-white/70 mt-0.5">
            AI Studio
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {HOME_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[10px] tracking-[0.22em] uppercase text-white/60 hover:text-[#D4AF37] transition-colors"
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
          Start Creating
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" aria-hidden />
        </button>
      </div>
    </header>
  )
}
