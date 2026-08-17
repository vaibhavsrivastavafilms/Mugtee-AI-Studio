'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { RecentProjectsStrip } from '@/components/projects/recent-projects-strip'
import { useAuthContext } from '@/components/auth/auth-provider'
import { loginRedirectUrl } from '@/lib/auth/public-routes'
import { V7IdeaInput } from '@/features/v7/components/idea-input'

function StudioAuthBanner() {
  const { user } = useAuthContext()
  if (user) return null

  return (
    <div className="mb-8 w-full max-w-3xl rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/5 px-5 py-4 text-center">
      <p className="text-sm text-white/75">
        Sign in or create a free account to start a production.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={loginRedirectUrl('/studio')}
          className="inline-flex min-h-[44px] items-center rounded-xl bg-[#D4AF37] px-5 text-sm font-semibold text-[#0B0B0B]"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup?next=%2Fstudio"
          className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-white/90"
        >
          Sign Up
        </Link>
      </div>
    </div>
  )
}

export function StudioLanding() {
  const [refreshToken, setRefreshToken] = useState(0)

  const handleProductionCreated = useCallback(() => {
    setRefreshToken((value) => value + 1)
  }, [])

  return (
    <>
      <StudioAuthBanner />
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <V7IdeaInput onProductionCreated={handleProductionCreated} />
      </div>
      <RecentProjectsStrip
        className="mt-10 w-full max-w-5xl shrink-0"
        refreshToken={refreshToken}
        studioOnly
      />
    </>
  )
}
