'use client'

import { Suspense } from 'react'
import { ForgotPasswordContent } from '@/components/auth/forgot-password-content'
import { OAuthLoadingState } from '@/components/auth/oauth-loading-state'

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<OAuthLoadingState />}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
