'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CinematicHeader } from '@/components/shell/cinematic-header'
import { StoreProvider } from '@/lib/store'
import { AutomationsProvider } from '@/lib/automations-store'
import { ConfirmProvider } from '@/components/ui/confirm'

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

            <CinematicHeader user={user} variant="app" />

            <motion.main
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-0 flex-1 flex flex-col min-w-0 w-full px-3 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6"
            >
              {children}
            </motion.main>
          </div>
        </ConfirmProvider>
      </AutomationsProvider>
    </StoreProvider>
  )
}
