import { Suspense } from 'react'
import { GrowthCommandCenter } from '@/components/agent/growth-command-center'

export const dynamic = 'force-dynamic'

export default function StudioGrowthPage() {
  return (
    <Suspense fallback={null}>
      <GrowthCommandCenter />
    </Suspense>
  )
}
