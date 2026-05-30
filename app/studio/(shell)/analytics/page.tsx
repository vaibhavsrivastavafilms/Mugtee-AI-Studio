import { UnifiedCreatorShell } from '@/components/create/unified-creator-shell'
import { CreatorAnalyticsDashboard } from '@/components/create/creator-analytics-dashboard'

export const dynamic = 'force-dynamic'

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
