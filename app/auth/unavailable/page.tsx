'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthUnavailable } from '@/components/auth/auth-unavailable'
import { OAuthLoadingState } from '@/components/auth/oauth-loading-state'
import { APP_ROUTE_LOGIN_FALLBACK } from '@/lib/auth/public-routes'
import { safeRelative } from '@/lib/url'

function AuthUnavailableInner() {
  const params = useSearchParams()
  const demoHref = safeRelative(params?.get('next'), APP_ROUTE_LOGIN_FALLBACK)
  return <AuthUnavailable demoHref={demoHref} />
}

export default function AuthUnavailablePage() {
  return (
    <Suspense fallback={<OAuthLoadingState message="Checking studio availability…" />}>
      <AuthUnavailableInner />
    </Suspense>
  )
}
