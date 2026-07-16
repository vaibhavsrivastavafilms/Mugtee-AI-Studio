'use client'

import nextDynamic from 'next/dynamic'
import { UnifiedCreatorShell } from '@/components/create/unified-creator-shell'

const CreatorAnalyticsDashboard = nextDynamic(
  () =>
    import('@/components/create/creator-analytics-dashboard').then(
      (m) => m.CreatorAnalyticsDashboard
    ),
  { ssr: false }
)

export default function StudioAnalyticsPage() {
  return (
    <UnifiedCreatorShell
      title="Growth"
      subtitle="Mugtee explains what connected, what lost people, and what we should try next."
    >
      <CreatorAnalyticsDashboard />
    </UnifiedCreatorShell>
  )
}
