'use client'

import { useCallback, useState } from 'react'
import { RecentProjectsStrip } from '@/components/projects/recent-projects-strip'
import { V7IdeaInput } from '@/features/v7/components/idea-input'

export function StudioLanding() {
  const [refreshToken, setRefreshToken] = useState(0)

  const handleProductionCreated = useCallback(() => {
    setRefreshToken((value) => value + 1)
  }, [])

  return (
    <>
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
