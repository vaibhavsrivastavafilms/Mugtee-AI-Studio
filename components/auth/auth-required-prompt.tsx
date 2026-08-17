'use client'

import Link from 'next/link'
import { loginRedirectUrl } from '@/lib/auth/public-routes'

export function AuthRequiredPrompt({
  message = 'Sign in to create films in Mugtee Studio.',
  returnPath = '/studio',
  className,
}: {
  message?: string
  returnPath?: string
  className?: string
}) {
  const loginHref = loginRedirectUrl(returnPath)
  const signupHref = `/auth/signup?next=${encodeURIComponent(returnPath)}`

  return (
    <div
      className={className}
      role="region"
      aria-label="Authentication required"
    >
      <p className="text-center text-sm text-red-300/90">{message}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={loginHref}
          className="inline-flex min-h-[44px] items-center rounded-xl bg-[#D4AF37] px-6 text-sm font-semibold text-[#0B0B0B] touch-manipulation"
        >
          Sign In
        </Link>
        <Link
          href={signupHref}
          className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 px-6 text-sm font-semibold text-white/90 touch-manipulation"
        >
          Sign Up
        </Link>
      </div>
    </div>
  )
}
