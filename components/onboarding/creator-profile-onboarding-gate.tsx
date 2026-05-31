'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  fetchCreatorProfileStatus,
  type CreatorMemoryProfile,
} from '@/lib/creator/creator-memory'
import { CreatorProfileOnboardingModal } from '@/components/onboarding/creator-profile-onboarding-modal'

function shouldGateOnboarding(pathname: string): boolean {
  if (pathname === '/dashboard') return true
  if (pathname === '/studio' || pathname.startsWith('/studio/')) return true
  return false
}

export function CreatorProfileOnboardingGate() {
  const pathname = usePathname() ?? ''
  const [checking, setChecking] = useState(true)
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<CreatorMemoryProfile>({})

  useEffect(() => {
    if (!shouldGateOnboarding(pathname)) {
      setChecking(false)
      setOpen(false)
      return
    }

    let alive = true
    setChecking(true)
    void fetchCreatorProfileStatus()
      .then(({ hasProfile, profile: loaded }) => {
        if (!alive) return
        setProfile(loaded)
        setOpen(!hasProfile)
      })
      .catch(() => {
        if (alive) setOpen(false)
      })
      .finally(() => {
        if (alive) setChecking(false)
      })

    return () => {
      alive = false
    }
  }, [pathname])

  if (checking || !shouldGateOnboarding(pathname)) return null

  return (
    <CreatorProfileOnboardingModal
      open={open}
      initialProfile={profile}
      onComplete={(saved) => {
        setProfile(saved)
        setOpen(false)
      }}
    />
  )
}
