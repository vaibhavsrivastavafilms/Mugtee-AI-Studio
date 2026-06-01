'use client'

import { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  loadCreatorLanguageSession,
  toCreatorLanguageSession,
  type CreatorLanguageSession,
} from '@/lib/i18n/creator-language-session'
import type { DetectedCreatorLanguage } from '@/lib/i18n/detect-creator-language'

function indicatorCopy(session: Pick<DetectedCreatorLanguage, 'displayName' | 'languageCode'>): string {
  if (session.languageCode === 'en') {
    return 'Mugtee is responding in English'
  }
  return `Mugtee is responding in ${session.displayName}`
}

export function CreatorLanguageIndicator({
  className,
  detected,
  hideWhenEnglish = true,
}: {
  className?: string
  /** Live detection override; falls back to session */
  detected?: DetectedCreatorLanguage | null
  hideWhenEnglish?: boolean
}) {
  const [session, setSession] = useState<CreatorLanguageSession | null>(null)

  useEffect(() => {
    setSession(detected ? toCreatorLanguageSession(detected) : loadCreatorLanguageSession())
  }, [detected])

  const active = detected ?? session
  if (!active) return null
  if (hideWhenEnglish && active.languageCode === 'en' && !active.isMixed) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03]',
        'px-2 py-0.5 text-[10px] tracking-wide text-luxe/55',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Globe className="w-2.5 h-2.5 text-gold-400/70 shrink-0" aria-hidden />
      {indicatorCopy(active)}
    </span>
  )
}
