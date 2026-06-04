'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { CinematicHeader } from '@/components/shell/cinematic-header'
import { StudioPromptBar } from '@/components/shell/studio-prompt-bar'
import { MugteeSidekickPanel } from '@/components/sidekick/mugtee-sidekick-panel'
import { CreatorProfileOnboardingGate } from '@/components/onboarding/creator-profile-onboarding-gate'
import { StoreProvider } from '@/lib/store'
import { AutomationsProvider } from '@/lib/automations-store'
import { ConfirmProvider } from '@/components/ui/confirm'
import { MugteeCommandCenter } from '@/components/mugtee-os/mugtee-command-center'
import { StudioCommandPalette } from '@/components/studio/studio-command-palette'
import { creatorModeFromPathname } from '@/lib/create/routes'

interface User {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

export default function CinematicAppShell({
  children,
  user,
}: {
  children: ReactNode
  user: User
}) {
  const name =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split('@')[0] ||
    'Producer'

  const pathname = usePathname() ?? ''
  const isCompanionHome = pathname === '/home' || pathname.startsWith('/home/')
  const creatorMode = creatorModeFromPathname(pathname)
  const isV4CreatorRoute = creatorMode === 'quick' || creatorMode === 'director'

  return (
    <StoreProvider userId={user.id} userName={name}>
      <AutomationsProvider userId={user.id}>
        <ConfirmProvider>
          <div className="relative min-h-[100dvh] flex flex-col bg-[#050505] text-foreground film-grain overflow-x-hidden">
            <div
              className="pointer-events-none fixed inset-0 -z-10 bg-noir-radial"
              aria-hidden
            />
            <div
              className="pointer-events-none fixed inset-0 -z-10 opacity-40"
              style={{
                background:
                  'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,175,55,0.12) 0%, transparent 55%)',
              }}
              aria-hidden
            />

            {!isV4CreatorRoute || creatorMode !== 'quick' ? (
              <CinematicHeader user={user} variant="app" />
            ) : null}
            {!isCompanionHome && !pathname.startsWith('/studio/workspace') && !isV4CreatorRoute ? (
              <StudioPromptBar />
            ) : null}
            {isV4CreatorRoute ? <StudioCommandPalette /> : null}
            <CreatorProfileOnboardingGate />

            <motion.main
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-0 flex-1 flex flex-col lg:flex-row min-w-0 w-full min-h-0"
            >
              <div
                className={
                  isCompanionHome
                    ? 'flex-1 flex flex-col min-w-0 w-full min-h-0'
                    : pathname.startsWith('/studio/workspace')
                      ? 'flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden'
                      : creatorMode === 'quick'
                      ? 'flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden p-0 pb-[max(4rem,calc(3rem+env(safe-area-inset-bottom)))] lg:pb-0'
                      : isV4CreatorRoute
                      ? 'flex-1 flex flex-col min-w-0 px-3 sm:px-5 lg:px-6 py-3 sm:py-4 lg:py-5 pb-[max(7rem,calc(5.5rem+env(safe-area-inset-bottom)))] lg:pb-5'
                      : 'flex-1 flex flex-col min-w-0 px-3 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 pb-[max(7rem,calc(5.5rem+env(safe-area-inset-bottom)))] lg:pb-6'
                }
              >
                {children}
              </div>
              {!isCompanionHome && creatorMode !== 'quick' ? <MugteeSidekickPanel /> : null}
            </motion.main>
            <MugteeCommandCenter />
          </div>
        </ConfirmProvider>
      </AutomationsProvider>
    </StoreProvider>
  )
}
