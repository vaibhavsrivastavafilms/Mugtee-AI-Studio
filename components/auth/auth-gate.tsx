'use client'

import type { ReactNode } from 'react'
import { useAuthContext } from '@/components/auth/auth-provider'
import { DevelopmentMode } from '@/components/auth/development-mode'
import { OAuthLoadingState } from '@/components/auth/oauth-loading-state'

type AuthGateProps = {
  continueHref: string
  children: ReactNode
  /** When true, show loading while session hydrates or redirecting signed-in users. */
  showLoadingWhenBusy?: boolean
  loadingMessage?: string
}

/**
 * Routes auth UI: Development Mode when unconfigured, production children otherwise.
 */
export function AuthGate({
  continueHref,
  children,
  showLoadingWhenBusy = true,
  loadingMessage = 'Preparing your studio…',
}: AuthGateProps) {
  const { ready, user, isDevelopmentMode } = useAuthContext()

  if (showLoadingWhenBusy && user) {
    return <OAuthLoadingState message={loadingMessage} />
  }

  if (isDevelopmentMode) {
    return <DevelopmentMode continueHref={continueHref} variant="welcome" />
  }

  return <>{children}</>
}
