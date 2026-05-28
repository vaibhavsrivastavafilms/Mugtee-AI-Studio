'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import type { CreatorMode } from '@/lib/create/routes'
import {
  authLoginHref,
  modeDestinationHref,
  persistModeEntry,
} from '@/lib/create/mode-selection'

type ModeEntryCtaProps = {
  mode: CreatorMode
  label: string
  className?: string
  locked?: boolean
  lockedParams?: Record<string, string | undefined>
}

export function ModeEntryCta({
  mode,
  label,
  className,
  locked = false,
  lockedParams,
}: ModeEntryCtaProps) {
  const router = useRouter()
  const { ready, user } = useAuthHydration()

  const destination = modeDestinationHref(mode, locked ? lockedParams : undefined)
  const loginHref = authLoginHref(mode, locked ? lockedParams : undefined)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    persistModeEntry(mode, locked ? lockedParams : undefined)

    if (!ready) return
    if (user) {
      router.push(destination)
      return
    }

    router.push(loginHref)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex w-full sm:w-auto min-h-[52px] items-center justify-center gap-2',
        'px-8 py-3.5 rounded-xl text-[12px] tracking-[0.16em] uppercase font-semibold',
        'transition-all duration-300',
        className
      )}
    >
      {label}
      <ArrowRight className="w-4 h-4" />
    </button>
  )
}
