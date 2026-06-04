'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { authLoginHref, persistModeEntry } from '@/lib/create/mode-selection'
import { useRouter } from 'next/navigation'
import { HOME_NAV, goldButton, STUDIO_QUICK } from '@/components/home/cinematic-home-styles'

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
        'shrink-0 z-50 border-b border-white/[0.06] bg-[#050505]/75 backdrop-blur-md',
        className
      )}
    >
      <div className="mx-auto flex h-12 lg:h-14 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-display text-[11px] sm:text-xs tracking-[0.28em] uppercase text-[#D4AF37] hover:opacity-90 transition-opacity"
        >
          Mugtee AI Studio
        </Link>

        <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
          {HOME_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[9px] xl:text-[10px] tracking-[0.22em] uppercase text-white/55 hover:text-[#D4AF37] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleStartCreating}
          className={cn(goldButton, 'shrink-0 px-4 py-2 min-h-[36px] text-[10px]')}
        >
          Start Creating
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
    </header>
  )
}
