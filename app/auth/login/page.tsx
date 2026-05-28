'use client'

import { Suspense } from 'react'
import { LoginContent } from '@/components/auth/login-content'
import { OAuthLoadingState } from '@/components/auth/oauth-loading-state'

export default function AuthLoginPage() {
  return (
    <Suspense fallback={<OAuthLoadingState />}>
      <LoginContent />
    </Suspense>
  )
}
