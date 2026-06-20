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
      title="Analytics"
      subtitle="Studio output from your Mugtee projects — scripts, videos, series, and milestones."
    >
      <CreatorAnalyticsDashboard />
    </UnifiedCreatorShell>
  )
}
